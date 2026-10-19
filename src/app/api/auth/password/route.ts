import { NextResponse, type NextRequest } from "next/server";
import { verificationClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import {
  clearRecoveryCookie,
  recoveryCookieName,
  verifyRecoveryScope,
} from "@/server/recoveryScope";
import { respond } from "@/server/respond";
import { userStage } from "@/server/userStage";
import { parseBody, passwordUpdateSchema, signinResponseSchema } from "@/server/validate";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = parseBody(passwordUpdateSchema, await request.json().catch(() => undefined));
    const { client, attachCookies } = verificationClient(request);
    const { data: userData } = await client.auth.getUser();
    const { data: sessionData } = await client.auth.getSession();
    if (!userData.user || !sessionData.session) return errors.unauthorized().toResponse();
    if (
      !verifyRecoveryScope(
        request.cookies.get(recoveryCookieName)?.value,
        userData.user.id,
        sessionData.session.access_token,
      )
    ) {
      const response = errors.codeExpired().toResponse();
      clearRecoveryCookie(response);
      return response;
    }

    const { error: updateError } = await client.auth.updateUser({ password: body.password });
    if (updateError) throw errors.internal();
    const { error: signoutError } = await client.auth.signOut({ scope: "others" });
    if (signoutError) throw errors.internal();

    const response = attachCookies(
      respond(signinResponseSchema, { stage: await userStage(client, userData.user.id) }),
    );
    clearRecoveryCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
