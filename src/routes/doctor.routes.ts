import { Hono } from "hono";
import { doctorController } from "../controllers/doctor.controller";

export const doctorRoutes = new Hono();

doctorRoutes.get("/:npi", doctorController.getOne);
doctorRoutes.get("/", doctorController.getMany);
