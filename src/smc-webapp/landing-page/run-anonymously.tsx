/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { useState } from "react";
import { React, useRedux } from "../app-framework";
import { WELL_STYLE } from "./sign-up";
import { UNIT } from "../r_misc";
const { Button, Checkbox, FormGroup, Well } = require("react-bootstrap");
const { TermsOfService } = require("../customize");
import { do_anonymous_setup } from "../client/anonymous-setup";
import { webapp_client } from "../webapp-client";

interface Props {
  show_terms: boolean;
  armed_launch: boolean;
}

export const RunAnonymously: React.FC<Props> = (params) => {
  const { show_terms, armed_launch } = params;
  const allow_anon = useRedux(["customize", "allow_anonymous_sign_in"]) ?? true;
  if (!allow_anon) return null;

  const [anon_checkbox, set_anon_checkbox] = useState(!show_terms);
  const site_name = useRedux(["customize", "site_name"]);

  const run_anonymously = (e) => {
    e.preventDefault();
    // do not create a default project if launching a custom image or a share
    // this will be done by the usual launch actions
    do_anonymous_setup(webapp_client, !armed_launch);
  };

  return (
    <Well style={WELL_STYLE}>
      <div>
        Alternatively, {show_terms && "accept the Terms of Service and "}
        run {site_name} without creating an account.
      </div>

      <form
        style={{ marginTop: UNIT, marginBottom: UNIT }}
        onSubmit={run_anonymously}
      >
        {show_terms && (
          <FormGroup style={{ fontSize: "12pt", margin: "20px" }}>
            <Checkbox onChange={(e) => set_anon_checkbox(e.target.checked)}>
              <TermsOfService />
            </Checkbox>
          </FormGroup>
        )}
        <Button
          style={{ marginBottom: UNIT, marginTop: UNIT }}
          disabled={!anon_checkbox}
          bsStyle={"default"}
          bsSize={"large"}
          type={"submit"}
          block
        >
          Run Anonymously
        </Button>
      </form>
    </Well>
  );
};
