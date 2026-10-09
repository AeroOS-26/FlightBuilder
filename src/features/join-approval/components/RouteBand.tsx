/**
 * The route band at the top of frame 44's panel.
 *
 * Read off the frame (`4034:39534`) rather than approximated:
 *
 *  - Two lines, not one. A 1.5px **dashed** line runs the full width — dashes
 *    `1 5` with round caps, so they read as dots — under a 7px **solid** bar
 *    that covers the left half. The plane sits on the join at the midpoint, so
 *    the pair reads as "this much of the journey is behind you".
 *  - Both lines carry a gradient, and they are not the same gradient. The
 *    dashed one runs `#E96A6F` → `#1946C5` across the whole span, which is why
 *    the dots past the plane are blue. The solid one runs `#E96A6F` → `#EFEEF0`,
 *    so it fades out as it reaches the plane rather than ending in a hard stop.
 *  - Codes are Inter Display 30/600 in `#080B2B`; the city under each is Inter
 *    Tight 14/500 black. The left pair is left-aligned, the right pair
 *    right-aligned, which is why this is a three-part row and not a centred one.
 *
 * The frame fixes the line at 520px inside a 772px card. Here it is whatever is
 * left between the two labels, so the band holds its shape on a phone; the
 * plane stays at the midpoint either way.
 */

/**
 * The frame's own plane, exported from node `4034:39743` and inlined.
 *
 * Two things about it. Figma wrapped a ~30px glyph in a **118x118** canvas that
 * is almost entirely drop-shadow bleed — `feGaussianBlur stdDeviation 26.7` —
 * and left the plane 21.5 units above the canvas centre because the shadow is
 * offset downward. Rendered at 29px that gave an 8px plane sitting high. The
 * viewBox below is the path's real bounding box, measured with `getBBox`, so
 * the box and the glyph are the same thing.
 *
 * Inlined rather than served from `/svg`, because the first version of that
 * file was the untrimmed export and a browser that cached it keeps showing the
 * small plane under the same URL. There is nothing to cache here.
 *
 * Measured against the frame: the plane is 30.3px where the line is 520px.
 */
const PLANE_VIEWBOX = '43.06 21.53 31.87 31.89'
const PLANE_PATH =
  'M68.7576 31.919C70.8994 32.1465 72.2516 33.4405 73.4029 34.6245C73.8862 35.12 74.4273 35.6748 74.6568 36.1951C75.0149 37.0068 75.0149 37.9359 74.6568 38.7476C74.4273 39.2679 73.8862 39.8227 73.4029 40.3182C72.2516 41.5022 70.8994 42.7962 68.7576 43.0237C67.3591 43.1722 65.8713 42.4711 64.5041 42.8071C63.9338 42.9473 63.6407 43.3751 63.0386 44.3658L58.967 51.0656C58.0337 52.6014 56.6386 53.4129 54.8367 53.4129C54.3379 53.4129 53.6254 53.3127 53.1542 52.7211C52.6838 52.1303 52.7384 51.4066 52.8569 50.8887L54.7936 42.4236C54.8612 42.1283 54.895 41.9806 54.8199 41.8746C54.3618 41.2274 51.4618 41.2467 50.8283 41.4753C50.4202 41.6225 49.9656 41.9851 49.4315 42.5499C48.8953 43.1168 48.4169 43.736 47.8728 44.2955C47.435 44.7458 46.726 45.1128 46.0507 45.2888C45.424 45.4522 44.3833 45.5603 43.6101 44.867C42.8171 44.1558 43.0137 43.1541 43.3792 42.2924C44.0382 40.7388 44.6015 39.1372 45.2103 37.5631C45.2219 37.5319 45.2381 37.4515 45.2103 37.3796L43.3793 32.6503C43.0137 31.7886 42.817 30.7869 43.6101 30.0757C44.3833 29.3824 45.424 29.4905 46.0507 29.6539C46.726 29.8299 47.435 30.1969 47.8728 30.6472C48.4259 31.216 48.9189 31.8509 49.4315 32.3928C49.9656 32.9576 50.4202 33.3202 50.8283 33.4674C51.4618 33.696 54.3618 33.7153 54.8199 33.0681C54.895 32.9621 54.8612 32.8144 54.7936 32.5191L52.8569 24.054C52.7384 23.5361 52.6838 22.8124 53.1542 22.2216C53.6254 21.63 54.3379 21.5298 54.8367 21.5298C56.6386 21.5298 58.0337 22.3413 58.967 23.8771L63.0386 30.5769C63.6407 31.5676 63.9338 31.9954 64.5041 32.1356C65.8713 32.4716 67.3591 31.7705 68.7576 31.919Z'

/**
 * 30px on the desktop frame, 24 on the 440 one — and smaller again here when
 * the slot holds a city rather than a code. The frame only ever puts two or
 * three characters in it ("SF", "NYK"); a group formed on a city has no code
 * to show, so "Kuusamo" lands in the same slot and eats the row the line needs.
 */
const CODE =
  'font-heading text-[20px] font-semibold leading-[1.1] text-[#080B2B] sm:text-[24px] lg:text-[30px]'
const CITY = 'font-sans text-[12px] font-medium leading-[1.15] text-[#000000] lg:text-[14px]'

export function RouteBand({
  originCode,
  originCity,
  destinationCode,
  destinationCity,
}: {
  originCode: string
  originCity: string
  destinationCode: string
  destinationCity: string
}) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={CODE}>{originCode}</span>
        {originCity !== originCode && <span className={CITY}>{originCity}</span>}
      </div>

      {/* A floor, so the band cannot be squeezed to nothing by long labels —
          below about 70px the dashes and the plane stop reading as a route. */}
      <div className="relative h-[7px] min-w-[72px] flex-1 shrink-0" aria-hidden="true">
        {/*
          `x2="100%"` with `gradientUnits="userSpaceOnUse"` keeps the dashes at
          their true length whatever the width — a viewBox would scale them, and
          `1 5` stretched is no longer a dot.
        */}
        <svg
          className="absolute inset-x-0 top-1/2 -translate-y-1/2"
          width="100%"
          height="2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="routeBandDash"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
            >
              <stop stopColor="#E96A6F" />
              <stop offset="1" stopColor="#1946C5" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="1"
            x2="100%"
            y2="1"
            stroke="url(#routeBandDash)"
            strokeWidth="1.5"
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute left-0 top-1/2 h-[4.4px] w-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#E96A6F_0%,#EFEEF0_100%)] lg:h-[7px]" />
        <svg
          viewBox={PLANE_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 lg:size-[30px]"
        >
          <path d={PLANE_PATH} fill="#112D7C" />
        </svg>
      </div>

      <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
        <span className={CODE}>{destinationCode}</span>
        {destinationCity !== destinationCode && <span className={CITY}>{destinationCity}</span>}
      </div>
    </div>
  )
}
