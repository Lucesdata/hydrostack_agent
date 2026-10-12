import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabase/actions", () => ({
  signUpAction: vi.fn(),
  signInWithGoogleAction: vi.fn(),
}));
vi.mock("@/src/lib/sesion-local/sesion-local", () => ({ sesionLocalActiva: () => false }));
vi.mock("@/src/lib/secop/destacados-portada", () => ({ destacadosPortada: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import RegistroPage from "@/app/registro/page";
import { GoogleButton } from "@/src/components/auth/GoogleButton";
import { signUpAction, signInWithGoogleAction } from "@/src/lib/supabase/actions";

function nodos(node: ReactNode): any[] {
  if (Array.isArray(node)) return node.flatMap(nodos);
  if (!isValidElement(node)) return [];
  const props = node.props as { children?: ReactNode };
  return [node, ...nodos(props.children)];
}

describe("Contrato del formulario de alta", () => {
  it("conserva la action, validación nativa y next de alta y Google", async () => {
    const vista = await RegistroPage({ searchParams: Promise.resolve({ next: "/mis-procesos" }) });
    const tree = nodos(vista);
    const form = tree.find((n) => n.type === "form");
    expect(form.props.action).toBe(signUpAction);
    const campos = tree.filter((n) => n.type === "input");
    expect(campos.map((n) => n.props.name)).toEqual(["next", "fullName", "email", "password"]);
    expect(campos[0].props.value).toBe("/mis-procesos");
    expect(campos.slice(1).every((n) => n.props.required)).toBe(true);
    expect(campos[2].props).toMatchObject({ type: "email", autoComplete: "email" });
    expect(campos[3].props).toMatchObject({
      type: "password",
      minLength: 8,
      autoComplete: "new-password",
    });
    const google = tree.find((n) => n.type === GoogleButton);
    expect(google.props.next).toBe("/mis-procesos");
    const googleForm = GoogleButton(google.props);
    expect(googleForm.props.action).toBe(signInWithGoogleAction);
  });
  it("anuncia errores y conserva el destino en el enlace de login", async () => {
    const tree = nodos(
      await RegistroPage({
        searchParams: Promise.resolve({ next: "/mis-procesos", error: "weak_password" }),
      })
    );
    expect(tree.find((n) => n.props.role === "alert").props.children).toContain("8 caracteres");
    expect(tree.some((n) => n.props.href === "/login?next=%2Fmis-procesos")).toBe(true);
  });
});
