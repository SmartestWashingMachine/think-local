import "./Landing.css";

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="landing">
      <div className="landing__content">
        <h1 className="landing__title">Think Local</h1>
        <p className="landing__subtitle">
          A private sanctuary for conversation. Every message stays on your
          machine - absolute confidentiality. Connect with intelligence that
          answers only to you.
        </p>
        <button className="landing__button" onClick={onStart} type="button">
          Get started
        </button>
      </div>
    </div>
  );
}
