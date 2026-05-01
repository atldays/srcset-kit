import { expect, test } from "@rstest/core";

import * as srcsetKit from "../src/index";

test("exports a loadable public module", () => {
  expect(srcsetKit).toBeDefined();
});
