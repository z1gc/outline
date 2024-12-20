import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import env from "~/env";
import OutlineIcon from "./Icons/OutlineIcon";

type Props = {
  href?: string;
};

function Branding({ href = env.URL }: Props) {
  return (
    <Div>
      <Link href={href}>
        <OutlineIcon size={20} />
        &nbsp;{env.APP_NAME}
      </Link>
      {env.SHARE_FOOTER_TEXT && env.SHARE_FOOTER_HREF && (
        <Link style={{ fontWeight: 400 }} href={env.SHARE_FOOTER_HREF}>
          {env.SHARE_FOOTER_TEXT}
        </Link>
      )}
    </Div>
  );
}

const Div = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  ${breakpoint("tablet")`
    z-index: ${depths.sidebar + 1};
    position: fixed;
    bottom: 0;
    right: 0;
  `};
`;

const Link = styled.a`
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  color: ${s("text")};
  display: flex;

  svg {
    fill: ${s("text")};
  }

  padding: 8px 12px;
  ${breakpoint("tablet")`
    background: ${s("sidebarBackground")};
    &:hover {
      background: ${s("sidebarControlHoverBackground")};
    }
  `};
`;

export default Branding;
