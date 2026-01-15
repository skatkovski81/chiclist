import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/lists/[id] - Get single list with products
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const list = await prisma.list.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        savedProducts: {
          include: {
            product: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { savedProducts: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching list:", error);
    return NextResponse.json(
      { error: "Failed to fetch list" },
      { status: 500 }
    );
  }
}

// PATCH /api/lists/[id] - Update list (name, emoji)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, emoji } = body;

    // Verify the list belongs to the user
    const existingList = await prisma.list.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingList.name) {
      const duplicateList = await prisma.list.findFirst({
        where: {
          userId: session.user.id,
          name: name.trim(),
          id: { not: id },
        },
      });

      if (duplicateList) {
        return NextResponse.json(
          { error: "A list with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: { name?: string; emoji?: string | null } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (emoji !== undefined) {
      updateData.emoji = emoji || null;
    }

    const updatedList = await prisma.list.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json(
      { error: "Failed to update list" },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id] - Delete list (products move to no list)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the list belongs to the user
    const existingList = await prisma.list.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Move all products in this list to no list (null)
    await prisma.savedProduct.updateMany({
      where: {
        listId: id,
        userId: session.user.id,
      },
      data: {
        listId: null,
      },
    });

    // Delete the list
    await prisma.list.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json(
      { error: "Failed to delete list" },
      { status: 500 }
    );
  }
}
