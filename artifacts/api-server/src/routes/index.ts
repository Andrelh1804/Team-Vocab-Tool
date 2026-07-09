import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import devicesRouter from "./devices";
import ticketsRouter from "./tickets";
import alertsRouter from "./alerts";
import aiRouter from "./ai";
import automationsRouter from "./automations";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(devicesRouter);
router.use(ticketsRouter);
router.use(alertsRouter);
router.use(aiRouter);
router.use(automationsRouter);
router.use(usersRouter);

export default router;
