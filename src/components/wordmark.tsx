import styles from "./wordmark.module.css";

/**
 * The ConnectAble.work logo, rebuilt from the brand sheet as live text so it
 * stays crisp at any size and is announced once, as one image, by screen
 * readers. Size it by setting `--wordmark-size` on `className`; every inner
 * dimension scales with it.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.wordmark} ${className}`} role="img" aria-label="ConnectAble.work">
      <span className={styles.name} aria-hidden="true">
        <span data-part="connect">Connect</span>
        <span data-part="able">Able</span>
      </span>
      <span className={styles.work} data-part="work" aria-hidden="true">.work</span>
    </span>
  );
}
