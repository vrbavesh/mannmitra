import Link from "next/link";
import LandingEffects from "@/components/three/LandingEffects";
import styles from "./landing.module.css";

export default function Home() {
  return (
    <div className={styles.landing} id="landing">
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.still} data-orb-still>
          <div className={styles.orb} />
          <i />
          <i />
          <i />
        </div>
        <LandingEffects />
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link className={styles.brand} href="/" aria-label="MannMitra home">
          <i aria-hidden="true" />
          MannMitra
        </Link>
        <div className={styles.actions}>
          <Link className={styles.link} href="/signin">
            Sign in
          </Link>
          <Link className={`${styles.button} ${styles.small}`} href="/signup">
            Get started
          </Link>
        </div>
      </nav>
      <main id="main" tabIndex={-1}>
        <section className={styles.panel} data-landing-panel aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title">Understand how you feel. Gently.</h1>
            <p>
              Check in with yourself, then follow thirty days of small, calming practices made for
              you.
            </p>
            <div className={styles.row}>
              <Link className={styles.button} href="/signup">
                Start your check-in
              </Link>
              <Link className={styles.link} href="/signin">
                I have an account
              </Link>
            </div>
          </div>
        </section>
        <section
          className={`${styles.panel} ${styles.right}`}
          data-landing-panel
          aria-labelledby="screening-title"
        >
          <div>
            <h2 id="screening-title">Start with how you feel today.</h2>
            <p>
              A short screening helps you understand where you are. Your results guide a self-help
              track, with a mood check before and after each activity.
            </p>
            <p>
              If self-guided tools are not the right next step, we will help you find professional
              support. This is a screening, not a diagnosis.
            </p>
          </div>
        </section>
        <section
          className={`${styles.panel} ${styles.wide}`}
          data-landing-panel
          aria-labelledby="plan-title"
        >
          <div>
            <h2 id="plan-title">Thirty days, with room to rest.</h2>
            <p>
              A main practice, then a lighter day. Reflect again on day thirty and see what changed.
            </p>
            <div className={styles.sheet} data-landing-sheet>
              <div
                className={styles.strip}
                role="img"
                aria-label="Thirty-day preview: odd days have a main practice, even days have a short activity, and day 30 is a final check-in."
              >
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1;
                  return (
                    <span
                      key={day}
                      className={`${styles.day} ${day === 30 ? styles.check : day % 2 ? styles.practice : styles.light}`}
                      aria-hidden="true"
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
              <div className={styles.key} aria-hidden="true">
                <span>
                  <i className={styles.practice} />
                  Main practice
                </span>
                <span>
                  <i className={styles.light} />
                  Lighter day
                </span>
                <span>
                  <i className={styles.check} />
                  Final check-in
                </span>
              </div>
              <p className={styles.caption}>
                10–15 minutes on practice days. Just 1–3 minutes on lighter days.
              </p>
            </div>
          </div>
        </section>
        <section
          className={`${styles.panel} ${styles.wide}`}
          data-landing-panel
          aria-labelledby="activities-title"
        >
          <div>
            <h2 id="activities-title">Choose what soothes you.</h2>
            <p>Your track brings together small practices like these.</p>
            <ul className={styles.rows}>
              <li>
                <b>Listen</b>
                <span>Calming soundscapes, on headphones or speakers.</span>
              </li>
              <li>
                <b>Watch</b>
                <span>Immersive videos for a VR headset, or a gentler version on your screen.</span>
              </li>
              <li>
                <b>Draw</b>
                <span>A blank canvas for what words cannot hold.</span>
              </li>
            </ul>
          </div>
        </section>
        <section
          className={`${styles.panel} ${styles.center}`}
          data-landing-panel
          aria-labelledby="ready-title"
        >
          <div>
            <h2 id="ready-title">Ready when you are.</h2>
            <div className={styles.row}>
              <Link className={styles.button} href="/signup">
                Start your check-in
              </Link>
              <Link className={styles.link} href="/signin">
                Sign in
              </Link>
            </div>
            <p className={styles.note}>
              MannMitra offers supportive tools and is not a substitute for professional care.
            </p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link className={styles.brand} href="/">
          MannMitra
        </Link>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/crisis">Find support</Link>
        </nav>
      </footer>
    </div>
  );
}
