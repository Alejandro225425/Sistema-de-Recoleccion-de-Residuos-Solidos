import React, { FormEvent, useEffect, useRef, useState } from "react";
import { request } from "../api";
import { Session, Zone, Role } from "../types";

interface AuthViewProps {
  zones: Zone[];
  onLogin: (email: string, password: string) => Promise<void>;
  message: string;
}

type AuthMode = "login" | "register" | "forgot";

const FALLBACK_ZONES = ["Centro Historico", "Wanchaq", "San Sebastian", "San Jeronimo", "Santiago"];

const STRENGTH_RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Contiene una letra", test: (p) => /[a-zA-Z]/.test(p) },
  { label: "Contiene un número", test: (p) => /[0-9]/.test(p) },
  { label: "Contiene un símbolo", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function passwordStrength(password: string): { label: string; color: string } {
  const passed = STRENGTH_RULES.filter((rule) => rule.test(password)).length;
  if (passed < 2) return { label: "Débil", color: "var(--error)" };
  if (passed < 3) return { label: "Regular", color: "var(--warning)" };
  if (passed < 4) return { label: "Buena", color: "var(--eco-accent)" };
  return { label: "Fuerte", color: "var(--eco-primary)" };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = STRENGTH_RULES.filter((rule) => rule.test(password)).length;
  const strength = passwordStrength(password);
  const percentage = (passed / STRENGTH_RULES.length) * 100;

  return (
    <div className="password-strength" aria-label="Fortaleza de la contraseña">
      <div className="strength-bar">
        <div
          className="strength-fill"
          style={{ width: `${percentage}%`, backgroundColor: strength.color }}
        />
      </div>
      <div className="strength-labels">
        <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
        <span className="strength-rules">
          ({passed}/{STRENGTH_RULES.length})
        </span>
      </div>
    </div>
  );
}

export function AuthView({ zones, onLogin, message }: AuthViewProps) {
  const fallbackZones = zones.length ? zones.map((zone) => zone.name) : FALLBACK_ZONES;
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const token = String(form.get("token") || "").trim();
    const name = String(form.get("name") || "").trim();
    const role = String(form.get("role") || "ciudadano") as Role;
    const zone = String(form.get("zone") || "Centro Historico");

    setIsSubmitting(true);
    setFeedback("");
    setShowPassword(false);
    setShowNewPassword(false);

    try {
      if (mode === "register") {
        const created = await request<{ token?: string; user?: Session; detail?: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role, zone }),
        });
        if (!created.token || !created.user) {
          throw new Error(created.detail || "No se pudo registrar el usuario");
        }
        localStorage.setItem("sir-token", created.token);
        localStorage.setItem("sir-session", JSON.stringify({ ...created.user, email }));
        window.location.reload();
        return;
      }

      if (mode === "forgot") {
        if (!email) throw new Error("Ingresa un correo para recuperar la contraseña");
        if (!token) {
          const response = await request<{ ok?: boolean; token?: string; message?: string }>("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
          });
          if (response.token) setRecoveryToken(response.token);
          setFeedback(response.message || "Si el correo existe, se enviará el token de recuperación");
          return;
        }
        const response = await request<{ ok?: boolean; message?: string; detail?: string }>("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
        if (!response.ok) throw new Error(response.detail || "No se pudo restablecer la contraseña");
        setFeedback(response.message || "Contraseña actualizada correctamente");
        setRecoveryToken("");
        setMode("login");
        return;
      }

      await onLogin(email, password);
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo completar la acción";
      setFeedback(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFeedback("");
    setRecoveryToken("");
    setShowPassword(false);
    setShowNewPassword(false);
    setRegisterPassword("");
    setLoginPassword("");
    setForgotPassword("");
    emailRef.current?.focus();
  };

  const submitLabel =
    mode === "login" ? "Iniciar Sesión" : mode === "forgot" ? "Restablecer contraseña" : "Crear cuenta";

  return (
    <main className="auth-view" role="main">
      <section className="auth-image-section" aria-label="Presentación EcoCusco">
        <div className="auth-overlay">
          <div className="auth-branding">
            <h1 className="eco-logo">
              <span>🌿</span> EcoCusco
            </h1>
            <p className="auth-tagline">Gestión Inteligente de Residuos Sólidos</p>
            <div className="eco-features">
              <div className="eco-feature">
                <span>♻️</span>
                <p>Recolección Segregada</p>
              </div>
              <div className="eco-feature">
                <span>🌍</span>
                <p>Impacto Ambiental Positivo</p>
              </div>
              <div className="eco-feature">
                <span>🤝</span>
                <p>Participación Comunitaria</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-section">
        <form className="auth-panel" onSubmit={handleSubmit} noValidate>
          <div className="form-header">
            <h2>Bienvenido a EcoCusco</h2>
            <p>Plataforma de Gestión Ambiental Urbana</p>
          </div>

          <div className="auth-tabs" role="group" aria-label="Modos de autenticación">
            <button
              type="button"
              aria-pressed={mode === "login"}
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => toggleMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              aria-pressed={mode === "register"}
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => toggleMode("register")}
            >
              Registrarme
            </button>
            <button
              type="button"
              aria-pressed={mode === "forgot"}
              className={`auth-tab ${mode === "forgot" ? "active" : ""}`}
              onClick={() => toggleMode("forgot")}
            >
              Recuperar contraseña
            </button>
          </div>

          {message && (
            <p className="auth-message error" role="alert" aria-live="assertive">
              {message}
            </p>
          )}

          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="auth-name">Nombre Completo</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Ej. Ana Quispe Huamán"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Correo Electrónico</label>
            <input
              id="auth-email"
              ref={emailRef}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu.email@ejemplo.com"
            />
          </div>

          {mode !== "forgot" && (
            <div className="form-group">
              <label htmlFor="auth-password">Contraseña</label>
              <div className="password-field">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Mínimo 8 caracteres"
                  value={
                    mode === "register"
                      ? registerPassword
                      : loginPassword
                  }
                  onChange={
                    mode === "register"
                      ? (e) => setRegisterPassword(e.target.value)
                      : (e) => setLoginPassword(e.target.value)
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === " " && setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>

              {mode === "register" && <PasswordStrength password={registerPassword} />}
            </div>
          )}

          {mode === "forgot" && (
            <div className="form-group">
              <label htmlFor="auth-token">Token de recuperación</label>
              <input
                id="auth-token"
                name="token"
                type="text"
                autoComplete="one-time-code"
                placeholder="Pega el token recibido"
              />
              {recoveryToken && (
                <div className="recovery-token" aria-label="Token de recuperación generado">
                  <span>Token de recuperación:</span>
                  <code>{recoveryToken}</code>
                  <button
                    type="button"
                    className="ghost-link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(recoveryToken);
                        setFeedback("Token copiado al portapapeles");
                      } catch {
                        setFeedback("No se pudo copiar el token");
                      }
                    }}
                  >
                    Copiar
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "forgot" && (
            <div className="form-group">
              <label htmlFor="auth-new-password">Nueva contraseña</label>
              <div className="password-field">
                <input
                  id="auth-new-password"
                  name="password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Ingresa una nueva contraseña"
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showNewPassword}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === " " && setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="auth-role">Rol de Usuario</label>
                <select id="auth-role" name="role">
                  <option value="ciudadano">👤 Ciudadano</option>
                  <option value="operador">👷 Operador Municipal</option>
                  <option value="admin">👨‍💼 Administrador</option>
                  <option value="conductor">🚗 Conductor</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="auth-zone">Zona</label>
                <select id="auth-zone" name="zone">
                  {fallbackZones.map((zoneName) => (
                    <option key={zoneName} value={zoneName}>
                      {zoneName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Procesando...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>

          <div className="form-links">
            {mode === "login" && (
              <button
                type="button"
                className="ghost-link"
                onClick={() => toggleMode("forgot")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <span className="divider">•</span>
             <a
               href="https://www.ecocusco.gob.pe/terminos"
               target="_blank"
               rel="noopener noreferrer"
             >
              Términos y Condiciones
            </a>
          </div>

          {feedback && (
            <p
              className={`hint ${
                feedback.includes("correctamente") || feedback.includes("copiado")
                  ? "success"
                  : "error"
              }`}
              role={feedback.includes("correctamente") || feedback.includes("copiado") ? "status" : "alert"}
              aria-live="polite"
            >
              {feedback}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
