# VoidRunner recovery notes (from the stopped duplicate port thread)

- decompiled-cs/: full Assembly-CSharp.dll decompile (ilspycmd 8.2, dotnet-sdk-8.0 from Ubuntu apt, DOTNET_ROLL_FORWARD=Major).
- levels/lvl1-3.json: every GameObject in built levels level0-2 (= scene_lvl1-3), world x/y/rot/scale (Unity units, y up), tags, colliders, sprites.
- sprites-and-clips.json: sprite rects (PPU 18 for gameplay art) and animation frame lists.
- tools/: UnityPy scripts used. MonoBehaviour fields have no typetree; tools/fields.py parses raw bytes.

Tuning recovered from serialized fields (same in all 3 levels):
- Player: maxSpeed 4, speed 50, jumpPower 300, maxVerticalSpeed 8, maxWallJumpPower 55, minWallJumpPower 20, drillSpeed 10, wallJumpDecreaseMultiplier 5, maxHealth 5. Mass 1, gravity 9.81, fixed step 0.02 s -> jump impulse = 6 u/s, ground damping vx*=0.75 per step.
- Molerat: speed 10, maxVertical/HorizontalDistance 10, runBackTime 0.1, mass 1.1.
- Turret: wakeRange 12, shootInterval 3, bulletSpeed 11.
- Camera: perspective FOV 60, z clamp(-|v|, -15, -8), cameraSpeed 6; BG at z 12.1 (parallax ~0.4).
- Level 2 has two rotated ground pieces (-32 and -35 deg); everything else is 0/90/180.
