import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/lists - Get user's lists
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const lists = await prisma.list.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { savedProducts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch lists" },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create new list
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, emoji } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate list name for this user
    const existingList = await prisma.list.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
      },
    });

    if (existingList) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 400 }
      );
    }

    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        emoji: emoji || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating list:", error);
    return NextResponse.json(
      { error: "Failed to create list" },
      { status: 500 }
    );
  }
}
