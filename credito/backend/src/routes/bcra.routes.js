import { Router } from "express"; // ✅ Corregido el importimport  {bcraController} from "../controllers/bcra.controller.js";
import { bcraController } from "../controllers/bcra.controller.js";


const router = Router();

router.get("/:cuit", bcraController)
console.log("llamando a routes");
;

export default router;
