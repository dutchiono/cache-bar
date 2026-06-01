import actionCache from "@convex-dev/action-cache/convex.config.js";
import aggregate from "@convex-dev/aggregate/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

app.use(workflow);
app.use(rateLimiter);
app.use(actionCache);
app.use(migrations);
app.use(resend);
app.use(aggregate, { name: "orderMetrics" });
app.use(aggregate, { name: "paymentMetrics" });
app.use(aggregate, { name: "redemptionMetrics" });
app.use(aggregate, { name: "conciergeMetrics" });

export default app;
