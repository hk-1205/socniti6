const express = require("express");
const controller = require("../controllers/eventController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", controller.listEvents);
router.get("/dashboard", requireAuth, requireRole("organizer", "admin"), controller.getOrganizerDashboard);
router.get("/:slug", controller.getEventBySlug);
router.post("/", requireAuth, controller.createEvent);
router.patch("/:slug", requireAuth, controller.updateEvent);
router.delete("/:slug", requireAuth, controller.deleteEvent);
router.post("/:slug/register", requireAuth, controller.registerForEvent);
router.post("/:slug/cancel", requireAuth, controller.cancelRegistration);

module.exports = router;
