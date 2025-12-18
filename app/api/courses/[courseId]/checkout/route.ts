import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Create Stripe Checkout for Course Purchase
 * POST /api/courses/[courseId]/checkout
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { courseId } = await params;

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: {
          select: {
            name: true,
            ownerId: true,
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
    if (!course.isPaid || course.price <= 0) {
      return NextResponse.json(
        { error: "Course is not a paid course" },
        { status: 400 }
      );
    }

    // Check if user already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.coursePayment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: "succeeded",
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Already purchased this course" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = session.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to user
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    // Create Stripe Checkout Session
    let checkoutSession;

    if (course.stripePriceId) {
      // Use existing Stripe Price
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: course.stripePriceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/dashboard/courses/${courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard/courses/${courseId}`,
        metadata: {
          courseId,
          userId: session.user.id,
          type: "course_purchase",
        },
        customer_email: session.user.email || undefined,
      });
    } else {
      // Create price inline (if stripeProductId doesn't exist)
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: course.title,
                description: course.description || undefined,
              },
              unit_amount: Math.round(course.price * 100), // cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/dashboard/courses/${courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard/courses/${courseId}`,
        metadata: {
          courseId,
          userId: session.user.id,
          type: "course_purchase",
        },
        customer_email: session.user.email || undefined,
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Error creating course checkout:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}

/**
 * Get payment status
 * GET /api/courses/[courseId]/checkout
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { courseId } = await params;

    // Check if user has paid for this course
    const payment = await prisma.coursePayment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: "succeeded",
      },
    });

    return NextResponse.json({
      success: true,
      hasPaid: !!payment,
      payment,
    });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check payment" },
      { status: 500 }
    );
  }
}