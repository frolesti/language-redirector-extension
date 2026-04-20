"""
Generate 'on' toggle PNG icons (128x128) from the actual SVG pill paths.
Uses the real pill shape from the logo, not a programmatic ellipse.
  ACTIVE (ON):   purple pill fill + yellow border + yellow 'on'
  INACTIVE (OFF): yellow pill fill + purple border + purple 'on'
"""
import cairo
from PIL import Image
import io, os, re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(SCRIPT_DIR, '..', 'img', 'icons')
OUTPUT_ON  = os.path.join(ICONS_DIR, 'logo_on.png')
OUTPUT_OFF = os.path.join(ICONS_DIR, 'logo_off.png')
OUTPUT_CA  = os.path.join(ICONS_DIR, 'logo_ca.png')

TX = (0.1, 0, 0, -0.1, 0, 2267.72)

PURPLE = '#422C80'
YELLOW = '#F2EB6B'

# --- SVG paths (source coordinates, top pill group from temp_symbol.svg) ---

# Pill interior (outer contour used as solid fill)
PATH_PILL_FILL = "M12290.5 13851.9H10386.6C9851.7 13851.9 9416.49 14287.1 9416.49 14822.1V14844.5C9416.49 15379.5 9851.7 15814.7 10386.6 15814.7H12290.5C12825.5 15814.7 13260.7 15379.5 13260.7 14844.5V14822.1C13260.7 14287.1 12825.5 13851.9 12290.5 13851.9Z"

# Pill border ring (two sub-paths: inner contour + outer contour)
PATH_PILL_BORDER = "M10386.6 15714.7C9906.84 15714.7 9516.49 15324.3 9516.49 14844.5V14822.1C9516.49 14342.3 9906.84 13951.9 10386.6 13951.9H12290.5C12770.3 13951.9 13160.7 14342.3 13160.7 14822.1V14844.5C13160.7 15324.3 12770.3 15714.7 12290.5 15714.7ZM12290.5 13851.9H10386.6C9851.7 13851.9 9416.49 14287.1 9416.49 14822.1V14844.5C9416.49 15379.5 9851.7 15814.7 10386.6 15814.7H12290.5C12825.5 15814.7 13260.7 15379.5 13260.7 14844.5V14822.1C13260.7 14287.1 12825.5 13851.9 12290.5 13851.9"

# "o" filled circle
PATH_O = "M11169.3 14833.3C11169.3 14434.8 10846.3 14111.7 10447.8 14111.7 10049.2 14111.7 9726.18 14434.8 9726.18 14833.3 9726.18 15231.8 10049.2 15554.9 10447.8 15554.9 10846.3 15554.9 11169.3 15231.8 11169.3 14833.3"

# "n" letter
PATH_N = "M11306.3 15514.6H11721.6V15324.3H11727.3C11740.8 15351.2 11760 15378.1 11785 15405 11810 15431.9 11839.8 15456 11874.4 15477.1 11909 15498.3 11948.4 15515.6 11992.6 15529 12036.8 15542.5 12084.9 15549.2 12136.8 15549.2 12246.4 15549.2 12334.8 15532.4 12402.1 15498.8 12469.3 15465.1 12521.7 15418.5 12559.2 15358.9 12596.7 15299.3 12622.2 15229.1 12635.6 15148.4 12649.1 15067.7 12655.8 14980.2 12655.8 14886V14113.2H12223.3V14799.5C12223.3 14839.9 12221.8 14881.7 12219 14924.9 12216.1 14968.2 12207.4 15008.1 12193 15044.6 12178.6 15081.1 12156.5 15110.9 12126.7 15134 12096.9 15157.1 12054.1 15168.6 11998.4 15168.6 11942.6 15168.6 11897.5 15158.5 11862.9 15138.3 11828.2 15118.1 11801.8 15091.2 11783.6 15057.6 11765.3 15023.9 11753.3 14985.9 11747.5 14943.7 11741.7 14901.4 11738.9 14857.2 11738.9 14811V14113.2H11306.3"

# ViewBox in transformed coordinates (tight around the pill)
VB_X, VB_Y = 939, 684
VB_W, VB_H = 390, 202


def parse_path(d):
    tokens = re.findall(r'[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    cmds, cur, args = [], None, []
    for t in tokens:
        if t.isalpha():
            if cur is not None: cmds.append((cur, args))
            cur, args = t, []
        else:
            args.append(float(t))
    if cur is not None: cmds.append((cur, args))
    return cmds


def draw_path(ctx, d):
    cx, cy = 0, 0
    for cmd, args in parse_path(d):
        if cmd == 'M':
            i = 0
            while i + 1 < len(args):
                if i == 0: ctx.move_to(args[i], args[i+1])
                else: ctx.line_to(args[i], args[i+1])
                cx, cy = args[i], args[i+1]; i += 2
        elif cmd == 'H':
            for x in args: ctx.line_to(x, cy); cx = x
        elif cmd == 'V':
            for y in args: ctx.line_to(cx, y); cy = y
        elif cmd == 'C':
            i = 0
            while i + 5 < len(args):
                ctx.curve_to(*args[i:i+6]); cx, cy = args[i+4], args[i+5]; i += 6
        elif cmd in ('Z', 'z'):
            ctx.close_path()


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def draw_svg_path(ctx, d, color):
    """Draw an SVG path (in source coords) with the transform matrix, filled with color."""
    ctx.new_path()
    ctx.save()
    ctx.transform(cairo.Matrix(*TX))
    draw_path(ctx, d)
    ctx.restore()
    ctx.set_source_rgb(*hex_rgb(color))
    ctx.fill()


def render(output_path, bg_color, fg_color, render_size=512):
    scale = min(render_size / VB_W, render_size / VB_H)
    img_w, img_h = int(VB_W * scale), int(VB_H * scale)

    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, render_size, render_size)
    ctx = cairo.Context(surface)
    ctx.translate((render_size - img_w) / 2, (render_size - img_h) / 2)
    ctx.scale(scale, scale)
    ctx.translate(-VB_X, -VB_Y)

    # 1. Pill interior fill (background color)
    draw_svg_path(ctx, PATH_PILL_FILL, bg_color)

    # 2. Pill border ring (foreground color)
    draw_svg_path(ctx, PATH_PILL_BORDER, fg_color)

    # 3. "o" circle (foreground color)
    draw_svg_path(ctx, PATH_O, fg_color)

    # 4. "n" letter (foreground color)
    draw_svg_path(ctx, PATH_N, fg_color)

    # Export to 128x128 PNG
    buf = io.BytesIO()
    surface.write_to_png(buf); buf.seek(0)
    img = Image.open(buf).convert('RGBA')
    bbox = img.getbbox()
    if bbox: img = img.crop(bbox)

    final = 128
    ratio = min(final / img.width, final / img.height)
    nw, nh = max(1, int(img.width * ratio)), max(1, int(img.height * ratio))
    resized = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (final, final), (0, 0, 0, 0))
    canvas.paste(resized, ((final - nw) // 2, (final - nh) // 2), resized)
    canvas.save(output_path, 'PNG')


# ACTIVE: purple pill + yellow border/on
render(OUTPUT_ON, bg_color=PURPLE, fg_color=YELLOW)
print(f"Created: {OUTPUT_ON}")

# INACTIVE: yellow pill + purple border/on (inverted)
render(OUTPUT_OFF, bg_color=YELLOW, fg_color=PURPLE)
print(f"Created: {OUTPUT_OFF}")

# CA language icon: same as ON (configura.cat brand colors)
render(OUTPUT_CA, bg_color=PURPLE, fg_color=YELLOW)
print(f"Created: {OUTPUT_CA}")

print("Done!")
