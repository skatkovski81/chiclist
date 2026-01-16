import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  console.log("[REGISTER] Starting registration");

  try {
    const body = await request.json();
    const { name, email, password } = body;
    console.log("[REGISTER] Email:", email);

    // Validate required fields
    if (!email || !password) {
      console.log("[REGISTER] Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("[REGISTER] Invalid email format");
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      console.log("[REGISTER] Password too short");
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    console.log("[REGISTER] Checking for existing user:", email.toLowerCase());
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    console.log("[REGISTER] Existing user:", !!existingUser);

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    console.log("[REGISTER] Hashing password...");
    const passwordHash = await bcrypt.hash(password, 12);
    console.log("[REGISTER] Password hashed successfully");

    // Create user
    console.log("[REGISTER] Creating user...");
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    console.log("[REGISTER] User created:", user.id);

    return NextResponse.json(
      { message: "Account created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
