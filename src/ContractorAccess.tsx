import { useEffect, useState, type FormEvent } from "react";
import type { ContractorCompany as Company } from "./domain";

export const contractorSessionKey = "fieldwork:contractor:session";

/** Presentation-only company selection. Never an authorization boundary. */
export function useContractorSession(companies: Company[], loaded = true) {
  const [companyId, setCompanyId] = useState(
    () => sessionStorage.getItem(contractorSessionKey) ?? "",
  );
  useEffect(() => {
    if (loaded && companyId && !companies.some((c) => c.id === companyId)) {
      sessionStorage.removeItem(contractorSessionKey);
      setCompanyId("");
    }
  }, [loaded, companies, companyId]);
  return {
    company: companies.find((company) => company.id === companyId),
    signIn(id: string) {
      sessionStorage.setItem(contractorSessionKey, id);
      setCompanyId(id);
    },
    signOut() {
      sessionStorage.removeItem(contractorSessionKey);
      setCompanyId("");
    },
  };
}

export function ContractorAccess({
  companies,
  submitted,
  onSignIn,
  loading,
  onApply,
  applicationDisabled = loading,
}: {
  companies: Company[];
  submitted: { name: string; email: string } | null;
  onSignIn: (companyId: string) => void;
  loading: boolean;
  onApply: () => void;
  applicationDisabled?: boolean;
}) {
  const [email, setEmail] = useState(submitted?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [matchingEmail, setMatchingEmail] = useState("");
  const [choice, setChoice] = useState("");
  const matches = companies.filter(
    (company) => company.email.trim().toLowerCase() === matchingEmail,
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== "123") {
      setError("Incorrect password. Use 123.");
      return;
    }
    const normalized = email.trim().toLowerCase();
    const found = companies.filter(
      (company) => company.email.trim().toLowerCase() === normalized,
    );
    if (!found.length) {
      setError(
        "No company found for that email. Check the address or submit a new application.",
      );
      return;
    }
    setPassword("");
    if (found.length === 1) onSignIn(found[0].id);
    else {
      setMatchingEmail(normalized);
      setChoice("");
    }
  }
  return (
    <section className="panel portal-access">
      {submitted ? (
        <div className="submission-confirmation" role="status">
          <span className="pill">APPLICATION RECEIVED</span>
          <h2>Application submitted</h2>
          <p>
            Thanks, {submitted.name}. Your company application is with
            Recruitment.
          </p>
          <p>
            Sign in with <strong>{submitted.email}</strong> and demo password{" "}
            <strong>123</strong> to follow your journey.
          </p>
        </div>
      ) : (
        <div className="portal-welcome">
          <span className="eyebrow">YOUR COMPANY. YOUR NEXT STEP.</span>
          <h2>Your next opportunity starts here.</h2>
          <p>
            Join our contractor network. Bring your skills; we’ll guide your
            company through the documents, qualifications and setup to get ready
            for work. One-person companies welcome.
          </p>
          <button
            className="primary portal-marquee-cta"
            onClick={onApply}
            disabled={applicationDisabled}
          >
            Start a new application <span aria-hidden>→</span>
          </button>
          <p className="portal-first-step">
            First step: tell us about your company and the skill you offer. No
            sign in needed.
          </p>
        </div>
      )}
      <p className="demo-auth-note">
        Demo sign-in. Use your application email and password 123. No real
        authentication, password storage or security boundary.
      </p>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {matchingEmail ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (matches.some((company) => company.id === choice))
              onSignIn(choice);
            else setError("Choose a company to continue.");
          }}
        >
          <h3>Choose your company</h3>
          <p>
            More than one company uses {matchingEmail}. Choose the company you
            want to work with.
          </p>
          <label>
            Company for this sign in
            <select
              required
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
            >
              <option value="">Select a company</option>
              {matches.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.id.slice(0, 8)})
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button className="primary" disabled={loading || !choice}>
              Continue to company
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setMatchingEmail("");
                setError("");
              }}
            >
              Use another email
            </button>
          </div>
        </form>
      ) : (
        <form className="portal-signin" onSubmit={submit}>
          {!submitted && <span className="eyebrow">ALREADY APPLIED?</span>}
          <h3>Sign in to your company</h3>
          <div className="form-grid">
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          <button className="primary" disabled={loading}>
            Sign In
          </button>
        </form>
      )}
    </section>
  );
}
