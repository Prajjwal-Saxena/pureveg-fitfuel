import { Activity, Flame, HeartPulse, Leaf } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { CatalogPayload, PlannerInputState, PlannerResult, ProfilePayload } from "../types";

const SELECTS = {
  goal: ["build-muscle", "lose-fat", "maintain", "athlete", "kids", "seniors", "health"],
  activity: ["sedentary", "light", "moderate", "active", "athlete"],
  preference: ["any", "veg", "vegan", "pescatarian"],
  gender: ["male", "female"]
} as const;

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function PlannerSection({
  catalogMeta,
  plannerInput,
  onPlannerChange,
  onSubmit,
  onSaveProfile,
  planner,
  profileSaved
}: {
  catalogMeta: CatalogPayload["catalogMeta"];
  plannerInput: PlannerInputState;
  onPlannerChange: (patch: Partial<PlannerInputState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveProfile: (profile: ProfilePayload) => void;
  planner: PlannerResult | null;
  profileSaved: boolean;
}) {
  return (
    <section className="planner-panel" id="planner">
      <div className="section-copy">
        <span className="pill">Phase 2 onboarding</span>
        <h3>User profile and meal intelligence</h3>
        <p>Guest session auth is now live, profiles persist server-side, and onboarding captures richer nutrition context.</p>
      </div>
      <div className="planner-grid">
        <form className="planner-form" onSubmit={onSubmit}>
          <label>
            <span>Goal</span>
            <select value={plannerInput.goal} onChange={(event) => onPlannerChange({ goal: event.target.value as PlannerInputState["goal"] })}>
              {SELECTS.goal.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Activity</span>
            <select value={plannerInput.activity} onChange={(event) => onPlannerChange({ activity: event.target.value as PlannerInputState["activity"] })}>
              {SELECTS.activity.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Age</span>
            <input type="number" value={plannerInput.age} onChange={(event) => onPlannerChange({ age: Number(event.target.value) })} />
          </label>
          <label>
            <span>Weight (kg)</span>
            <input type="number" value={plannerInput.weight} onChange={(event) => onPlannerChange({ weight: Number(event.target.value) })} />
          </label>
          <label>
            <span>Height (ft)</span>
            <input type="number" value={plannerInput.heightFeet} onChange={(event) => onPlannerChange({ heightFeet: Number(event.target.value) })} />
          </label>
          <label>
            <span>Height (in)</span>
            <input type="number" min={0} max={11} value={plannerInput.heightInches} onChange={(event) => onPlannerChange({ heightInches: Number(event.target.value) })} />
          </label>
          <label>
            <span>Preference</span>
            <select value={plannerInput.preference} onChange={(event) => onPlannerChange({ preference: event.target.value as PlannerInputState["preference"] })}>
              {SELECTS.preference.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Gender</span>
            <select value={plannerInput.gender} onChange={(event) => onPlannerChange({ gender: event.target.value as PlannerInputState["gender"] })}>
              {SELECTS.gender.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Budget</span>
            <select value={plannerInput.budgetLevel} onChange={(event) => onPlannerChange({ budgetLevel: event.target.value as PlannerInputState["budgetLevel"] })}>
              {catalogMeta.budgetBands.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>User segment</span>
            <select value={plannerInput.userSegment} onChange={(event) => onPlannerChange({ userSegment: event.target.value as PlannerInputState["userSegment"] })}>
              {catalogMeta.userSegments.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="planner-span">
            <span>Medical conditions</span>
            <input
              type="text"
              placeholder={catalogMeta.medicalConditions.join(", ")}
              value={plannerInput.medicalConditions.join(", ")}
              onChange={(event) =>
                onPlannerChange({
                  medicalConditions: event.target.value
                    .split(",")
                    .map((entry) => entry.trim())
                    .filter(Boolean)
                })
              }
            />
          </label>
          <label className="planner-span">
            <span>Allergies</span>
            <input type="text" value={plannerInput.allergies} onChange={(event) => onPlannerChange({ allergies: event.target.value })} />
          </label>
          <div className="planner-actions planner-span">
            <button className="primary" type="submit">
              Generate meal plan
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() =>
                onSaveProfile({
                  ...plannerInput,
                  dietaryPreference: plannerInput.preference,
                  onboardingCompleted: true
                })
              }
            >
              {profileSaved ? "Profile saved" : "Save profile"}
            </button>
          </div>
        </form>
        <div className="planner-output">
          {planner ? (
            <>
              <div className="target-grid">
                <MetricCard icon={<Flame size={18} />} label="Calories" value={planner.targets.calories} />
                <MetricCard icon={<Activity size={18} />} label="Protein" value={`${planner.targets.protein}g`} />
                <MetricCard icon={<Leaf size={18} />} label="Carbs" value={`${planner.targets.carbs}g`} />
                <MetricCard icon={<HeartPulse size={18} />} label="Fats" value={`${planner.targets.fats}g`} />
              </div>
              <div className="schedule">
                {planner.schedule.map((entry) => (
                  <article key={`${entry.time}-${entry.label}`} className="schedule-card">
                    <span>
                      {entry.time} • {entry.label}
                    </span>
                    <strong>{entry.meal.name}</strong>
                    <p>
                      {entry.meal.macros.protein}g protein • {entry.meal.macros.calories} kcal • {money.format(entry.meal.price)}
                    </p>
                  </article>
                ))}
              </div>
              <div className="coach-note">
                <strong>Smart swap</strong>
                <p>{planner.smartSwap}</p>
                <p>
                  Estimated day total: {planner.totals.protein}g protein • {planner.totals.calories} kcal • {money.format(planner.totals.cost)}
                </p>
              </div>
            </>
          ) : (
            <div className="placeholder-card">
              <h4>Targets appear here</h4>
              <p>Profiles now persist to the backend, so your onboarding can become the base for dashboards and AI plans.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
