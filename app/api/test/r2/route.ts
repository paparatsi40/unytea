import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";

export async function GET() {
  console.log("🔍 Starting R2 test...");
  
  try {
    // Check if all R2 variables are configured
    const requiredVars = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ];

    console.log("📋 Checking environment variables...");
    const missingVars = requiredVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      console.error("❌ Missing variables:", missingVars);
      return NextResponse.json(
        {
          success: false,
          error: `Missing R2 environment variables: ${missingVars.join(", ")}`,
          hint: "Check your .env.local file and add the missing variables",
        },
        { status: 500 }
      );
    }

    console.log("✅ All variables present");
    console.log("🔑 R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID);
    console.log("🔑 R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);
    console.log("🔑 R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID?.substring(0, 10) + "...");

    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    console.log("🌐 Endpoint:", endpoint);

    // Initialize S3 Client for R2
    console.log("🔧 Initializing S3 Client...");
    const s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    // Test 1: List buckets (verify connection)
    console.log("📡 Testing connection - listing buckets...");
    try {
      const listResult = await s3Client.send(new ListBucketsCommand({}));
      console.log("✅ Connection successful! Buckets:", listResult.Buckets?.map(b => b.Name));
    } catch (error: any) {
      console.error("❌ ListBuckets failed:", error.name, error.message);
      console.error("Full error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to R2",
          details: error.message,
          errorName: error.name,
          hint:
            error.name === "InvalidAccessKeyId"
              ? "Invalid R2 credentials. Check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY"
              : error.name === "SignatureDoesNotMatch"
              ? "Invalid R2_SECRET_ACCESS_KEY. Make sure you copied it correctly"
              : "Connection failed. Verify your R2_ACCOUNT_ID",
        },
        { status: 500 }
      );
    }

    // Test 2: Upload a small test file
    console.log("📤 Testing upload...");
    const testContent = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      message: "R2 connection test successful!",
    });

    const testKey = `test/connection-test-${Date.now()}.json`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: testKey,
          Body: testContent,
          ContentType: "application/json",
        })
      );
      console.log("✅ Upload successful! File:", testKey);
    } catch (error: any) {
      console.error("❌ Upload failed:", error.name, error.message);
      console.error("Full error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to upload to R2",
          details: error.message,
          errorName: error.name,
          hint:
            error.name === "NoSuchBucket"
              ? `Bucket '${process.env.R2_BUCKET_NAME}' does not exist. Check the bucket name in Cloudflare dashboard`
              : "Upload failed. Check permissions on your R2 API token",
        },
        { status: 500 }
      );
    }

    console.log("🎉 All tests passed!");
    return NextResponse.json({
      success: true,
      message: "Cloudflare R2 configured correctly! ✅",
      tests: {
        credentialsValid: true,
        connectionSuccessful: true,
        uploadSuccessful: true,
        bucketName: process.env.R2_BUCKET_NAME,
        testFileUploaded: testKey,
      },
      config: {
        accountId: process.env.R2_ACCOUNT_ID,
        bucketName: process.env.R2_BUCKET_NAME,
        endpoint,
      },
      estimatedCosts: {
        storage: "$0.015 per GB/month",
        egress: "FREE (advantage over S3!)",
        operations: "Very low (~$0.01/month)",
      },
      nextSteps: [
        "✅ R2 is ready to store video recordings",
        "You can now start recording sessions",
        "Videos will be automatically uploaded to R2",
      ],
    });
  } catch (error: any) {
    console.error("💥 R2 test error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Stack:", error?.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
        errorName: error?.name || "UnknownError",
        hint: "Check your R2 configuration in .env.local. Verify all credentials at dash.cloudflare.com",
      },
      { status: 500 }
    );
  }
}
