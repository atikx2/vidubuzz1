"use client";

import { useState } from "react";
import { Eye, PlayCircle } from "lucide-react";
import type { PerformerProfile as PerformerProfileData } from "@/lib/demo-content";

export function PerformerProfile({ performer }: { performer: PerformerProfileData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="channel-profile performer-profile" aria-labelledby="performer-profile-title">
      <div className="channel-profile-top">
        <div className="channel-profile-avatar performer-profile-avatar">
          <img src={performer.image} alt={`${performer.name} profile`} width="240" height="135" />
          <span className="channel-profile-avatar-ring" />
        </div>
        <div className="channel-profile-identity">
          <p className="channel-profile-eyebrow">Pornstar</p>
          <h1 id="performer-profile-title">{performer.name}</h1>
          <div className="channel-profile-stats" aria-label={`${performer.videos}, ${performer.totalViews} views`}>
            <span><PlayCircle size={16} aria-hidden="true" />{performer.videos}</span>
            <span><Eye size={16} aria-hidden="true" />{performer.totalViews} views</span>
          </div>
        </div>
      </div>
      <div className={`channel-description ${isExpanded ? "channel-description-expanded" : ""}`}>
        <p>{performer.description}</p>
        <button
          className="channel-description-toggle"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      </div>
    </section>
  );
}
