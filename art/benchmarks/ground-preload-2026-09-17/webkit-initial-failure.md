# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: surface-preload.spec.ts >> an outstanding optional ground image cannot hold the title or coastal entry
- Location: tests/browser/surface-preload.spec.ts:4:1

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e1]:
  - generic "Explorable three-dimensional universe" [ref=e2]
  - generic:
    - generic:
      - strong: VOID EXPLORER
      - generic: LONG RANGE EXPLORATION VESSEL
    - generic:
      - text: N ─────
      - generic: 145°
      - text: ───── E
    - generic:
      - generic: CURRENT LOCATION
      - generic: ASTRIS PRIME
      - generic: 1 SYSTEMS DISCOVERED
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - text: NAVIGATION LOCK
      - generic [ref=e7]: LIVE
    - heading "Aurelia Veil" [level=2] [ref=e8]
    - text: OCEAN
    - paragraph [ref=e9]: 0 km
    - generic [ref=e10]:
      - generic [ref=e11]: MANUAL FLIGHT
      - generic "Estimate at current closing speed" [ref=e12]: —
    - paragraph [ref=e13]: Surface operations
    - generic [ref=e14]:
      - button "Leave ship F" [ref=e15] [cursor=pointer]:
        - text: Leave ship
        - generic [ref=e16]: F
      - button "Take off R" [ref=e17] [cursor=pointer]:
        - text: Take off
        - generic [ref=e18]: R
      - button "Open star chart TAB" [ref=e19] [cursor=pointer]:
        - text: Open star chart
        - generic [ref=e20]: TAB
  - status:
    - generic: LANDED
    - text: Touchdown confirmed. Surface access available.
  - generic [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: VELOCITY
        - generic [ref=e25]: 0.0 m/s
      - generic [ref=e26]:
        - generic [ref=e27]: FLIGHT PROFILE
        - generic [ref=e28]: LANDED
      - generic [ref=e29]:
        - generic [ref=e30]: SURFACE ALTITUDE
        - generic [ref=e31]: 3.0 m
      - generic [ref=e32]: THROTTLE
    - generic [ref=e35]:
      - button "H CONTROLS" [ref=e36] [cursor=pointer]
      - button "ESC MENU" [ref=e37] [cursor=pointer]
  - generic [ref=e38]:
    - generic [ref=e39]: WS THROTTLE
    - generic [ref=e40]: ↑↓←→ STEER
    - generic [ref=e41]: SHIFT BOOST
    - generic [ref=e42]: P PULSE
    - generic [ref=e43]: X BRAKE
```