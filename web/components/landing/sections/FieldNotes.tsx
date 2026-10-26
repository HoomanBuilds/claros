"use client";

import { A11y, EffectCoverflow, Keyboard, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { Arrow } from "@/components/landing/ui/Button";
import Button from "@/components/landing/ui/Button";
import { format, useLandingFeeds } from "@/lib/landing/feeds";
import styles from "./FieldNotes.module.css";

const NOTES = [
  { id: "EIA.PET.PRICE.WTI.DAILY", image: "/landing/avail/road.webp" },
  { id: "EIA.ELEC.GEN_SUN.US48.HOURLY", image: "/landing/avail/sun.webp" },
  { id: "OP-1", image: "/landing/avail/park.webp" },
  { id: "EIA.NG.PRICE.HENRYHUB.DAILY", image: "/landing/avail/vault.webp" },
  { id: "EIA.NG.STORAGE.L48_WORKING.WEEKLY", image: "/landing/avail/van.webp" },
  { id: "EIA.ELEC.DEMAND.US48.HOURLY", image: "/landing/avail/walk.webp" },
  { id: "EIA.CO2.AGG.US_TOTAL.ANNUAL", image: "/landing/avail/dunes.webp" },
];

export default function FieldNotes() {
  const { byId, stats, loading, error } = useLandingFeeds();
  const notes = NOTES.map(({ id, image }) => ({ feed: byId(id), image }));

  return (
    <section
      id="feeds"
      className={styles.notes}
      data-theme="warm"
      data-phase="0"
    >
      <div className={`container ${styles.head}`}>
        <div>
          <h2 className={styles.title} data-reveal>
            Live on Casper
          </h2>
          <p className={styles.sub} data-reveal role="status">
            <i className="live" aria-hidden="true" />
            {loading
              ? "Loading the latest attestations from AWS..."
              : error
                ? stats.feeds
                  ? "Connection interrupted. Showing the last available attestations."
                  : "Feeds are temporarily unavailable. Retrying automatically."
                : `${stats.feeds} feeds, ${stats.attestations.toLocaleString("en-US")} attestations, every one with a provenance hash.`}
          </p>
        </div>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.prev}
            aria-label="Previous note"
            data-sfx="ui"
          >
            <Arrow />
          </button>
          <button
            type="button"
            className={styles.next}
            aria-label="Next note"
            data-sfx="ui"
          >
            <Arrow />
          </button>
        </div>
      </div>

      <Swiper
        className={styles.swiper}
        modules={[EffectCoverflow, Navigation, Keyboard, A11y]}
        effect="coverflow"
        slidesPerView="auto"
        centeredSlides
        loop
        grabCursor
        keyboard={{ enabled: true, onlyInViewport: true }}
        spaceBetween={-60}
        navigation={{
          prevEl: `.${styles.prev}`,
          nextEl: `.${styles.next}`,
          addIcons: false,
        }}
        coverflowEffect={{
          rotate: 40,
          stretch: 0,
          depth: 120,
          modifier: 1,
          slideShadows: false,
        }}
      >
        {notes.map(({ feed, image }) => (
          <SwiperSlide key={feed.id} className={styles.slide}>
            <article className={styles.card} data-cursor="Drag">
              <div className={styles.imageWrap}>
                <img src={image} alt="" loading="lazy" />
                <span className={`label ${styles.tag}`}>
                  {feed.id.includes("GEN_SUN") ? "Operator feed" : feed.family}
                </span>
                <p className={styles.value}>
                  <span className="figure">{format(feed)}</span> {feed.unit}
                </p>
              </div>
              <div className={styles.body}>
                <h3>{feed.name}</h3>
                <p className="mono">
                  {feed.period}
                  {feed.frequency && `, ${feed.frequency}`}
                  {feed.hash && ` · ${feed.hash.slice(0, 10)}…`}
                </p>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className={`container ${styles.more}`}>
        <Button href="/feeds" variant="outline">
          Browse {stats.feeds ? `all ${stats.feeds} feeds` : "the feeds"}
        </Button>
      </div>
    </section>
  );
}
