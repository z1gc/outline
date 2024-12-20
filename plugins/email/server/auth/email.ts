import Router from "koa-router";
import { NotificationEventType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import accountProvisioner from "@server/commands/accountProvisioner";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Team } from "@server/models";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import * as T from "./schema";

const router = new Router();

// FIXME: ONLY FOR SELF HOSTED, DON'T USE IN OTHER ENVIRONMENT.
//        HASN'T FULLY TESTED, MALFUNCTIONAL MAY HAPPENS.

router.post(
  "email",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.EmailSchema),
  async (ctx: APIContext<T.EmailReq>) => {
    const { email, client } = ctx.input.body;

    const domain = parseDomain(ctx.request.hostname);

    let team: Team | null | undefined;
    if (!env.isCloudHosted) {
      team = await Team.scope("withAuthenticationProviders").findOne();
    } else if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { domain: domain.host },
      });
    } else if (domain.teamSubdomain) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { subdomain: domain.teamSubdomain },
      });
    }

    // Example: email="hello@sub.world.local", host="local.outline.dev":
    const { local } = parseEmail(email);
    const param = {
      ip: ctx.ip,
      // The team is correspoding to a host, therefore 1 host to 1 team.
      // For self-hosted, we may have only one team.
      team: {
        teamId: team?.id,
        name: env.APP_NAME,
        // Seems like the `domain` and `subdomain` are just used for the team
        // lookup, and for `!env.isClousHosted`, these values isn't really
        // matters, it always fetched the arbitrary team (or the latest).
        // For the real team, it means for a organization email, and in that
        // case it's matter.
        domain: domain.host /* ="local.outline.dev"*/,
        subdomain: domain.teamSubdomain /* =""*/,
      },
      user: {
        name: local /* ="hello"*/,
        email /* ="hello@sub.world.local"*/,
      },
      authenticationProvider: {
        name: "email",
        providerId: domain.host /* ="local.outline.dev"*/,
      },
      // This will be ignored by @see server/models/AuthenticationProviders.ts
      // with oauthClient().
      authentication: {
        // If a user is logined with multiple oauth, the providerId is used to
        // distinguish which provider is really the user logging in.
        // For us, email can only have one, there it's.
        // TODO: What does the "scopes" do?
        providerId: email /* ="hello@sub.world.local"*/,
        scopes: [],
      },
    };

    // @see plugins/oidc/server/auth.oidc.ts, passport.use
    const result = await accountProvisioner(param);
    if (result.isNewUser) {
      // TODO: Logger.info? Examples are in server/index.ts.
      Logger.info("email", JSON.stringify(param));
    }
    team = result.team;
    const user = result.user;

    if (!team?.emailSigninEnabled) {
      return ctx.redirect("/?notice=auth-error");
    }

    if (user.isSuspended) {
      return ctx.redirect("/?notice=user-suspended");
    }

    if (user.isInvited) {
      await new WelcomeEmail({
        to: user.email,
        role: user.role,
        teamUrl: team.url,
      }).schedule();

      const inviter = await user.$get("invitedBy");
      if (
        inviter?.subscribedToEventType(NotificationEventType.InviteAccepted)
      ) {
        await new InviteAcceptedEmail({
          to: inviter.email,
          inviterId: inviter.id,
          invitedName: user.name,
          teamUrl: team.url,
        }).schedule();
      }
    }

    // set cookies on response and redirect to team subdomain
    await signIn(ctx, "email", { ...result, client });

    // Overwrite the redirection, we make the frontend to do so, instead of the
    // request itself (signIn will redirect the POST request, rather then set a
    // new window location).
    // @see app/scenes/Login/components/AuthenticationProvider.tsx, handleSubmitEmail
    // @see koajs/koa/lib/response.js, redirect
    ctx.status = 200;
    ctx.body = {
      success: true,
      redirect: env.URL,
    };
  }
);

export default router;
