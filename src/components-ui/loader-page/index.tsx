'use client';

import clsx from 'clsx';
import styles from "./LoaderPage.module.css";

export const LoaderPage = () => {
  return (
    <div
      style={{
        height: typeof window !== "undefined" ? window.innerHeight - 100 : "calc(100vh - 100px)",
        display: "flex",
        alignItems: "center",
        width: "100%",
        background: "transparent",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div className={styles.logoContainer}>
        <img
          alt="logo"
          className={styles.logo}
          style={{ height: "60px" }}
          src="/images/logo.png"
        />
        <div className={clsx(styles.loadingDots, "m-3")}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default LoaderPage;
