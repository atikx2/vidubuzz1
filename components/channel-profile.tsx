"use client";

import { useState } from "react";
import { Eye, PlayCircle } from "lucide-react";
import type { DirectoryChannel } from "@/lib/demo-content";

export function ChannelProfile({ channel }: { channel: DirectoryChannel }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="channel-profile" aria-labelledby="channel-profile-title">
      <div className="channel-profile-top">
        <div className="channel-profile-avatar">
          <img src={channel.image} alt={`${channel.name} channel`} width="240" height="135" />
          <span className="channel-profile-avatar-ring" />
        </div>
        <div className="channel-profile-identity">
          <p className="channel-profile-eyebrow">Channel</p>
          <h1 id="channel-profile-title">{channel.name}</h1>
          <div className="channel-profile-stats" aria-label={`${channel.videos}, ${channel.totalViews} views`}>
            <span><PlayCircle size={16} aria-hidden="true" />{channel.videos}</span>
            <span><Eye size={16} aria-hidden="true" />{channel.totalViews} views</span>
          </div>
        </div>
      </div>
      <div className={`channel-description ${isExpanded ? "channel-description-expanded" : ""}`}>
        <p>{channel.description}</p>
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
