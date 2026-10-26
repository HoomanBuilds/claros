"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin);

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const DECODE_CHARS = "▖▘▝▗▚▞01#%&*+<>/\\";
