import { SigninForm } from "@/app/signin/SigninForm";

// The calm Google notices arrive as ?notice=..., so this route reads runtime
// data at request time instead of prerendering a notice-less shell.
export const instant = false;

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  return <SigninForm notice={notice} />;
}
