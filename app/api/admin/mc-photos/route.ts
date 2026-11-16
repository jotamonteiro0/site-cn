import { NextResponse } from "next/server";
import {
  getAllMCPhotos,
  saveMCPhoto,
  deleteMCPhoto,
} from "@/lib/mc-photos-store";
import { verifyMasterAccess } from "@/lib/master-auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const items = await getAllMCPhotos();
    return NextResponse.json({ items, total: items.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await request.json();

    if (!body.management_code || !body.photo_url || !body.member_name) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios ausentes: código da gestão, fotografia oficial e nome do Mestre Conselheiro são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const saved = await saveMCPhoto({
      management_code: body.management_code.trim(),
      management_roman: body.management_roman?.trim(),
      management_title: body.management_title?.trim(),
      member_id: body.member_id?.trim() || undefined,
      member_id_demolay: body.member_id_demolay?.trim() || undefined,
      member_name: body.member_name.trim(),
      periodo: body.periodo?.trim() || body.management_code.trim(),
      status: body.status || "Past MC",
      photo_url: body.photo_url.trim(),
      updated_by: auth.userId,
    });

    return NextResponse.json({ success: true, item: saved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Código da gestão é obrigatório para remoção da foto." },
        { status: 400 }
      );
    }

    const deleted = await deleteMCPhoto(code);
    if (!deleted) {
      return NextResponse.json(
        { error: "Fotografia da gestão não encontrada para remoção." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Fotografia removida com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
