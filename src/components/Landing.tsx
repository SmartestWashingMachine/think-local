import './Landing.css';

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="landing">
      <div className="landing__content">
        <h1 className="landing__title">Secret Chatter</h1>
        <p className="landing__subtitle">
          A private sanctuary for conversation. Every message stays on your
          machine — zero network egress, absolute confidentiality. Connect with
          intelligence that answers only to you.
        </p>
        <button className="landing__button" onClick={onStart} type="button">
          Begin your private conversation
        </button>
      </div>
    </div>
  );
}
