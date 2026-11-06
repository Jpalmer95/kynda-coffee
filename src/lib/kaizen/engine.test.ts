import { describe, it, expect } from "vitest";
import {
  classifyStaffIntake,
  parseEspressoDialIn,
  evaluateKaizenProposal,
  computeSkillRank,
  evaluateTierAction,
  forecastShiftDemand,
  detectShrinkageAnomalies,
  KYNDA_CO_PILOT_QUICKSTART_MODULE,
} from "./engine";

describe("Kynda Kaizen RSI & Command and Control Engine", () => {
  describe("parseEspressoDialIn", () => {
    it("parses a golden-spec morning espresso dial-in", () => {
      const res = parseEspressoDialIn(
        "Morning dial-in: Ethiopia single origin, 18.5g in, 37g out in 29s, bright berry notes"
      );
      expect(res).not.toBeNull();
      expect(res?.bean_name).toBe("Ethiopia Single Origin");
      expect(res?.dose_grams).toBe(18.5);
      expect(res?.yield_grams).toBe(37);
      expect(res?.time_seconds).toBe(29);
      expect(res?.ratio).toBe(2);
      expect(res?.is_in_spec).toBe(true);
    });

    it("flags a fast shot and coaches grinder finer adjustment", () => {
      const res = parseEspressoDialIn("Dial in shot: 18g in, 36g out in 19 seconds");
      expect(res).not.toBeNull();
      expect(res?.is_in_spec).toBe(false);
      expect(res?.coaching_note).toContain("FINER");
    });
  });

  describe("classifyStaffIntake — Kynda Standing Operating Rules", () => {
    it("prevents logging an equipment issue into the Waste Log and reroutes to equipment_ticket", () => {
      const res = classifyStaffIntake(
        "Put in the waste log that the espresso machine steam wand is leaking badly",
        "waste_entry"
      );
      expect(res.lane).toBe("equipment_ticket");
      expect(res.operating_rule_notice).toContain("Waste Log is strictly for food, drink");
      expect(res.equipment?.equipment_name).toBe("Espresso Machine");
      expect(res.equipment?.area).toBe("espresso_bar");
    });

    it("routes legitimate food/drink spills to waste_entry", () => {
      const res = classifyStaffIntake("Spilled 1 gallon of oat milk during the rush");
      expect(res.lane).toBe("waste_entry");
    });

    it("routes confidential messages to owner_whisper (Jonathan & Briseida only)", () => {
      const res = classifyStaffIntake(
        "Private whisper for Jonathan and Briseida: I have a safety concern about the back steps at night"
      );
      expect(res.lane).toBe("owner_whisper");
      expect(res.whisper?.topic).toBe("safety");
    });

    it("routes frontline process improvements to kaizen_proposal with impact score & bounty", () => {
      const res = classifyStaffIntake(
        "Kaizen idea: every Saturday rush we sell out of cold brew by 1pm. We should raise the cold brew par level from 2 to 3 kegs and store spare O-rings under the kegerator."
      );
      expect(res.lane).toBe("kaizen_proposal");
      expect(res.kaizen?.category).toBe("inventory");
      expect(res.kaizen?.target_system).toBe("ingredient_pars");
      expect(res.kaizen?.impact_score).toBeGreaterThanOrEqual(75);
      expect(res.kaizen?.suggested_bounty_cents).toBeGreaterThanOrEqual(1500);
    });

    it("enforces the rule that an unfinished opening checklist never blocks serving guests", () => {
      const res = classifyStaffIntake(
        "Does an unfinished opening checklist block us from serving guests at 7am?"
      );
      expect(res.lane).toBe("knowledge_qa");
      expect(res.operating_rule_notice).toContain("NEVER blocks serving guests");
    });
  });

  describe("evaluateTierAction — Dual-Owner Sacred Gate & Manager Micro-Budgets", () => {
    it("blocks staff and managers from approving Kaizen SOP compilations without Owner gate", () => {
      const staffTry = evaluateTierAction({
        role: "staff",
        action: "approve_kaizen_or_compile_sop",
      });
      expect(staffTry.allowed).toBe(false);
      expect(staffTry.requiresOwnerGate).toBe(true);

      const managerTry = evaluateTierAction({
        role: "manager",
        action: "approve_kaizen_or_compile_sop",
      });
      expect(managerTry.allowed).toBe(false);
      expect(managerTry.requiresOwnerGate).toBe(true);

      const ownerTry = evaluateTierAction({
        role: "owner",
        action: "approve_kaizen_or_compile_sop",
      });
      expect(ownerTry.allowed).toBe(true);
      expect(ownerTry.requiresOwnerGate).toBe(false);
    });

    it("allows Manager micro-spend under $100 cap and escalates larger POs to Jonathan & Briseida", () => {
      const smallPurchase = evaluateTierAction({
        role: "manager",
        action: "micro_spend_purchase",
        amountCents: 4500, // $45 emergency ice/milk
      });
      expect(smallPurchase.allowed).toBe(true);
      expect(smallPurchase.requiresOwnerGate).toBe(false);

      const largePurchase = evaluateTierAction({
        role: "manager",
        action: "micro_spend_purchase",
        amountCents: 22000, // $220
      });
      expect(largePurchase.allowed).toBe(false);
      expect(largePurchase.requiresOwnerGate).toBe(true);
    });
  });

  describe("computeSkillRank", () => {
    it("progresses baristas through the 5 Kaizen skill ranks", () => {
      expect(computeSkillRank(0).rank).toBe("Apprentice");
      expect(computeSkillRank(120).rank).toBe("Barista");
      expect(computeSkillRank(350).rank).toBe("Dial-In Specialist");
      expect(computeSkillRank(650).rank).toBe("Shift Maestro");
      expect(computeSkillRank(1200).rank).toBe("Kaizen Architect");
    });
  });

  describe("forecastShiftDemand", () => {
    it("boosts iced drink share and staffing on a sunny summer Saturday in Horseshoe Bay", () => {
      const res = forecastShiftDemand({
        dateIso: "2026-07-04", // Saturday in July
        baselineDailyRevenueCents: 150000,
        tempHighF: 94,
        weatherCondition: "sunny",
        isHolidayOrLakeEvent: true,
      });
      expect(res.demandMultiplier).toBeGreaterThan(1.5);
      expect(res.icedDrinkSharePct).toBeGreaterThanOrEqual(70);
      expect(res.shifts[0].recommendedBaristas).toBeGreaterThanOrEqual(3);
      expect(res.prepAlerts.some((a) => a.includes("High Iced Demand"))).toBe(true);
    });
  });

  describe("detectShrinkageAnomalies", () => {
    it("flags unaccounted ingredient depletion when actual usage exceeds POS + Waste log", () => {
      const anomalies = detectShrinkageAnomalies([
        {
          ingredientName: "Oat Milk (Barista Edition)",
          unit: "carton",
          unitCostCents: 450,
          theoreticalUsedQty: 20,
          loggedWasteQty: 2,
          actualDepletedQty: 32, // 10 cartons missing ($45 loss, 45.5% variance)
        },
      ]);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unaccountedQty).toBe(10);
      expect(anomalies[0].unaccountedLossCents).toBe(4500);
      expect(anomalies[0].severity).toBe("critical");
    });
  });

  describe("KYNDA_CO_PILOT_QUICKSTART_MODULE", () => {
    it("exposes a valid Module 0 onboarding training module", () => {
      expect(KYNDA_CO_PILOT_QUICKSTART_MODULE.category).toBe("onboarding");
      expect(KYNDA_CO_PILOT_QUICKSTART_MODULE.is_required).toBe(true);
      expect(KYNDA_CO_PILOT_QUICKSTART_MODULE.content).toContain("NEVER blocks serving guests");
    });
  });
});
