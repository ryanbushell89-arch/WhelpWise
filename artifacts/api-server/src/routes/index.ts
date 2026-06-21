import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import breedsRouter from "./breeds";
import dogsRouter from "./dogs";
import breedingsRouter from "./breedings";
import littersRouter from "./litters";
import buyersRouter from "./buyers";
import expensesRouter from "./expenses";
import studsRouter from "./studs";
import reportsRouter from "./reports";
import storageRouter from "./storage";
import petsRouter from "./pets";
import waitingListRouter from "./waiting-list";
import contractsRouter from "./contracts";
import contractTemplatesRouter from "./contract-templates";
import { publicInvitesRouter, authInvitesRouter, breederInvitesRouter } from "./invites";
import signRouter from "./sign";
import puppyOwnerRouter from "./puppy-owner";
import chatsRouter from "./chats";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";

const router: IRouter = Router();

// ─── Fully public ────────────────────────────────────────────────────────────
router.use(healthRouter);
router.use(usersRouter);
router.use(publicInvitesRouter); // GET /invites/:token — no auth needed
router.use(signRouter);           // GET+POST /contracts/sign/:token — token auth

// ─── Auth required (no subscription check) ───────────────────────────────────
router.use(requireAuth);
router.use(authInvitesRouter);  // POST /invites/:token/accept
router.use(puppyOwnerRouter);   // GET /puppy-owner/* (checks puppy_owner role internally)
router.use(chatsRouter);        // GET+POST /chats/* (works for both breeders and owners)
router.use(breedsRouter);       // GET /breeds — reference data, auth only

// ─── Auth + active subscription required ─────────────────────────────────────
router.use(requireSubscription);
router.use(dashboardRouter);
router.use(dogsRouter);
router.use(breedingsRouter);
router.use(littersRouter);
router.use(buyersRouter);
router.use(expensesRouter);
router.use(studsRouter);
router.use(reportsRouter);
router.use(storageRouter);
router.use(petsRouter);
router.use(waitingListRouter);
router.use(contractsRouter);
router.use(contractTemplatesRouter);
router.use(breederInvitesRouter); // POST /puppies/:puppyId/invite, GET /puppies/:puppyId/invite-status

export default router;
