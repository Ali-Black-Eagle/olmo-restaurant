"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ComponentProps, MouseEvent } from "react";

let pending: (() => void) | null = null;

type ViewTransitionLike = {
  ready?: Promise<void>;
  finished?: Promise<void>;
  updateCallbackDone?: Promise<void>;
};

/** Place once in the layout: resolves a pending view transition when the new route has rendered. */
export function ViewTransitionGate() {
  const pathname = usePathname();
  useEffect(() => {
    if (pending) {
      const done = pending;
      pending = null;
      // The new route is committed to the DOM, so the transition can capture it now.
      // Don't wait on requestAnimationFrame here: the browser suspends rendering while a
      // view transition's update callback is pending, so rAF would never fire.
      done();
    }
  }, [pathname]);
  return null;
}

/**
 * A normal Next link that runs the navigation inside document.startViewTransition,
 * so other pages crossfade in 200ms and a dish photo can morph into place on /menu.
 */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const pathname = usePathname();

  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    const target = typeof href === "string" ? href : href.pathname ?? "";
    const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void> | void) => ViewTransitionLike };
    const samePage = target.split("#")[0].split("?")[0] === pathname;
    if (!plain || reduce || !doc.startViewTransition || samePage || !target.startsWith("/")) return;
    e.preventDefault();
    // A transition is already waiting for its page: finish it now instead of leaving it hanging.
    if (pending) {
      const previous = pending;
      pending = null;
      previous();
    }
    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          pending = resolve;
          router.push(target);
          // Safety net, well under the browser's own DOM-update timeout, so a slow
          // route (first compile in dev, a slow network) never freezes the page.
          setTimeout(() => {
            if (pending === resolve) pending = null;
            resolve(); // resolving twice is harmless
          }, 800);
        }),
    );
    // If the browser skips or aborts the transition, the navigation still happens;
    // swallow the rejection so it doesn't surface as an unhandled error.
    const ignore = () => {};
    transition?.ready?.catch(ignore);
    transition?.finished?.catch(ignore);
    transition?.updateCallbackDone?.catch(ignore);
  }

  return <Link href={href} onClick={handle} {...props} />;
}
