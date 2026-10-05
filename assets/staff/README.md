# Employee clay avatars · revision 10

These nine avatars were made with the built-in image generation tool from the
user-supplied photographs on 2026-10-05. Revision 10 makes the faces clearly
cartoon-like and dresses every character in the prior Soha hanok cafe uniform.
Original employee photographs are not
published in this repository. Generated PNGs remain in the image-generation
outputs; these transparent 512px WebP files are the website copies.

| Employee | Stable ID | Branch | Saved asset |
| --- | --- | --- | --- |
| 김영채 | 105 | 코엑스·무역센터점 | `kim-youngchae-v10.webp` |
| 김보미 | 107 | 코엑스·무역센터점 | `kim-bomi-v10.webp` |
| 노윤아 | 108 | 코엑스·무역센터점 | `no-yuna-v10.webp` |
| 김민정 | 109 | 코엑스·무역센터점 | `kim-minjung-v10.webp` |
| 남지민 | 111 | 코엑스·무역센터점 | `nam-jimin-v10.webp` |
| 최지현 | 112 | 코엑스·무역센터점 | `choi-jihyun-v10.webp` |
| 황지현 | 114 | 광명 소하동 본점 | `hwang-jihyun-v10.webp` |
| 김민서 | 507 | 광명 소하동 본점 | `kim-minseo-v10.webp` |
| 조희연 | 508 | 광명 소하동 본점 | `jo-heeyeon-v10.webp` |

All other actual employees use `default-v9.svg`, a neutral silhouette, until
their photos are supplied. Legacy avatar slots no longer substitute another
person's face. Photo assignment is by employee ID rather than array order.
The frontend resolves these IDs to version 10 even when stored metadata still
names a version 9 image. No personnel, branches, schedules or attendance
records were changed for this visual revision.

## Prior-chat design references

- September 22 character instructions: rounded clay/animation style, simplified
  face, thick eyebrows and chunky sculpted hair; remove realistic skin, fine
  wrinkles, nasolabial lines, beard and individual hair strands.
- September 11 uniform chat and `한옥카페_저고리_롱앞치마_제작설계서.pdf`:
  cocoa greige jeogori `#786C5F`, matching collar, charcoal goreum and hidden
  inside snaps; warm charcoal long waist apron `#4F4C43`. The chat specified
  an apron slightly below mid-calf and a back slit. The avatar framing shows
  the jeogori and top of the apron, not its full length.
- Uniform colors are low saturation, Korean and appropriate to a hanok cafe.
  No hats, invented logos, Japanese or Chinese uniform details were added.

## Generation prompt set

Mode: edit from supplied photographs, transparent background. The first
photograph (김보미) and the old portal character sheet established the new
style; subsequent calls used each employee's own photograph as identity
reference and that new character only as a style, uniform, lighting and
composition reference. One employee asset was generated per call. Exact prompts
are recorded in `prompts-v10.json`.

Shared specification: clearly animated handmade clay toy character; large
rounded head, compact torso, smooth matte skin, small button nose, simple
sculpted mouth, expressive simplified eyes, thick eyebrows and a few broad clay
hair shapes. No photographic skin, wrinkles, realistic lips or fine hair
detail. Preserve each person's hairstyle, face silhouette and expression.
Centered head-to-waist portrait in the Korean jeogori and waist apron, with
transparent margins, soft studio light, no scene or text. Never copy the
style-reference person's identity.

Identity-specific prompt details:

- 김보미: rounded face, center-parted long dark hair with curved ends, slight
  closed-mouth smile.
- 노윤아: oval face, long dark wavy hair and airy parted bangs, small hoop
  earrings.
- 남지민: side-swept tied-back hair without bangs, smiling with teeth.
- 최지현: smooth center-parted long black hair tucked behind the ears, small hair
  clip, composed slight smile.
- 김영채: side-parted chin-length black bob, rounded lips, almond-shaped eyes,
  composed expression.
- 김민정: rounded face, center-parted tied-back dark hair with loose side wisps,
  calm mouth.
- 김민서: long softly wavy center-parted hair without fringe, subtle smile.
- 황지현: longer oval face, tied-back hair with short wispy bangs, small earrings,
  calm expression.
- 조희연: long straight dark hair and light wispy fringe, subtle closed-mouth
  smile.
