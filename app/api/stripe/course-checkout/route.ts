import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Create checkout session for course purchase with Stripe Connect
 * POST /api/stripe/course-checkout
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Get course with community owner info
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: {
          include: {
            owner: {
              select: {
                stripeConnectAccountId: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if course is paid
    if (!course.isPaid || !course.price) {
      return NextResponse.json(
        { error: "This course is free" },
        { status: 400 }
      );
    }

    // Check if user already purchased this course
    const existingPurchase = await prisma.coursePurchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingPurchase?.status === "completed") {
      return NextResponse.json(
        { error: "You have already purchased this course" },
        { status: 400 }
      );
    }

    // Check if community owner has Stripe Connect
    const ownerStripeAccountId = course.community.owner.stripeConnectAccountId;
    
    if (!ownerStripeAccountId) {
      return NextResponse.json(
        { error: "Course owner has not set up payments yet" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      email: session.user.email || "",
      userId,
    });

    // Calculate platform fee (5%)
    const platformFeePercent = 5;

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: course.currency || "usd",
            product_data: {
              name: course.title,
              description: `Course: ${course.title} - ${course.community.name}`,
            },
            unit_amount: Math.round(course.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/c/${course.community.slug}/courses/${course.slug}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/c/${course.community.slug}/courses/${course.slug}?canceled=true`,
      payment_intent_data: {
        application_fee_amount: Math.round((course.price * 100 * platformFeePercent) / 100),
        transfer_data: {
          destination: ownerStripeAccountId,
        },
      },
      metadata: {
        userId,
        courseId,
        type: "course_purchase",
      },
    });

    // Create or update purchase record
    await prisma.coursePurchase.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {
        stripeSessionId: checkoutSession.id,
        status: "pending",
      },
      create: {
        userId,
        courseId,
        amount: course.price,
        currency: course.currency || "USD",
        stripeSessionId: checkoutSession.id,
        status: "pending",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Error creating course checkout:", error);
    return NextResponse.json(
      { 
        error: "Failed to create checkout session",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
