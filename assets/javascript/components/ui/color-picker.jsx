import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select.jsx';
import { cn } from '../../lib/utils';
import { Range, Root, Thumb, Track } from '@radix-ui/react-slider';
import Color from 'color';
import { PipetteIcon } from 'lucide-react';

const ColorPickerContext = createContext(undefined);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }

  return context;
};

export const ColorPicker = ({
  value,
  defaultValue = '#000000',
  onChange,
  className,
  ...props
}) => {
  const selectedColor = Color(value || defaultValue);
  const defaultColor = Color(defaultValue);

  const [hue, setHue] = useState(
    selectedColor.hue() || defaultColor.hue() || 0
  );
  const [saturation, setSaturation] = useState(
    selectedColor.saturationl() || defaultColor.saturationl() || 100
  );
  const [lightness, setLightness] = useState(
    selectedColor.lightness() || defaultColor.lightness() || 50
  );
  const [alpha, setAlpha] = useState(
    selectedColor.alpha() * 100 || defaultColor.alpha() * 100
  );
  const [mode, setMode] = useState('hex');

  // Update color when controlled value changes
  useEffect(() => {
    if (value) {
      try {
        const color = Color(value).rgb().object();
        setHue(color.r);
        setSaturation(color.g);
        setLightness(color.b);
        setAlpha((color.alpha || 1) * 100);
      } catch (error) {
        console.error('Invalid color value:', error);
      }
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      try {
        const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
        const rgba = color.rgb().array();
        onChange([rgba[0], rgba[1], rgba[2], alpha / 100]);
      } catch (error) {
        console.error('Error generating color:', error);
      }
    }
  }, [hue, saturation, lightness, alpha, onChange]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div className={cn('grid w-full gap-4', className)} {...props} />
    </ColorPickerContext.Provider>
  );
};

export const ColorPickerSelection = ({
  className,
  ...props
}) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { hue, setSaturation, setLightness } = useColorPicker();

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDragging || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      );

      setPosition({ x, y });
      setSaturation((1 - y) * 100);
      setLightness(x * 100);
    },
    [isDragging, setSaturation, setLightness]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', () => setIsDragging(false));
    };
  }, [isDragging, handlePointerMove]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[4/3] w-full cursor-crosshair rounded',
        className
      )}
      style={{
        background: `linear-gradient(0deg,rgb(0,0,0),transparent),linear-gradient(90deg,rgb(255,255,255),hsl(${hue},100%,50%))`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
        handlePointerMove(e.nativeEvent);
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
};

export const ColorPickerHue = ({
  className,
  ...props
}) => {
  const { hue, setHue } = useColorPicker();

  return (
    <Root
      value={[hue]}
      max={360}
      step={1}
      className={cn('relative flex h-4 w-full touch-none', className)}
      onValueChange={([hue]) => setHue(hue)}
      {...props}
    >
      <Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Range className="absolute h-full" />
      </Track>
      <Thumb className="block h-4 w-4 rounded-full border border-slate-300 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Root>
  );
};

export const ColorPickerAlpha = ({
  className,
  ...props
}) => {
  const { alpha, setAlpha } = useColorPicker();

  return (
    <Root
      value={[alpha]}
      max={100}
      step={1}
      className={cn('relative flex h-4 w-full touch-none', className)}
      onValueChange={([alpha]) => setAlpha(alpha)}
      {...props}
    >
      <Track
        className="relative my-0.5 h-3 w-full grow rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-slate-400" />
        <Range className="absolute h-full rounded-full bg-transparent" />
      </Track>
      <Thumb className="block h-4 w-4 rounded-full border border-slate-300 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Root>
  );
};

export const ColorPickerEyeDropper = ({
  className,
  ...props
}) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // EyeDropper API is experimental
      if (window.EyeDropper) {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const color = Color(result.sRGBHex);
        const [h, s, l] = color.hsl().array();

        setHue(h);
        setSaturation(s);
        setLightness(l);
        setAlpha(100);
      } else {
        console.warn('EyeDropper API not supported in this browser');
      }
    } catch (error) {
      console.error('EyeDropper failed:', error);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleEyeDropper}
      className={cn('shrink-0 text-slate-500', className)}
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

const formats = ['hex', 'rgb', 'css', 'hsl'];

export const ColorPickerOutput = ({
  className,
  ...props
}) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select value={mode} onValueChange={setMode}>
      <SelectTrigger className="h-8 w-[4.5rem] shrink-0 text-xs" {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem key={format} value={format} className="text-xs">
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const PercentageInput = ({ className, ...props }) => {
  return (
    <div className="relative">
      <Input
        type="text"
        {...props}
        className={cn(
          'h-8 w-[3.25rem] rounded-l-none bg-slate-100 px-2 text-xs shadow-none',
          className
        )}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground text-xs">
        %
      </span>
    </div>
  );
};

export const ColorPickerFormat = ({
  className,
  ...props
}) => {
  const {
    hue,
    saturation,
    lightness,
    alpha,
    mode,
    setHue,
    setSaturation,
    setLightness,
    setAlpha,
  } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);

  if (mode === 'hex') {
    const hex = color.hex();

    const handleChange = (event) => {
      try {
        const newColor = Color(event.target.value);

        setHue(newColor.hue());
        setSaturation(newColor.saturationl());
        setLightness(newColor.lightness());
        setAlpha(newColor.alpha() * 100);
      } catch (error) {
        console.error('Invalid hex color:', error);
      }
    };

    return (
      <div
        className={cn(
          'relative flex items-center shadow-sm -space-x-px',
          className
        )}
        {...props}
      >
        <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs">
          #
        </span>
        <Input
          type="text"
          value={hex.replace('#', '')}
          onChange={handleChange}
          className="h-8 rounded-r-none bg-slate-100 px-2 pl-6 text-xs shadow-none"
        />
        <PercentageInput value={Math.round(alpha)} readOnly />
      </div>
    );
  }

  if (mode === 'rgb') {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn('flex items-center shadow-sm -space-x-px', className)}
        {...props}
      >
        {rgb.map((value, index) => (
          <Input
            key={index}
            type="text"
            value={value}
            readOnly
            className={cn(
              'h-8 rounded-r-none bg-slate-100 px-2 text-xs shadow-none',
              index && 'rounded-l-none'
            )}
          />
        ))}
        <PercentageInput value={Math.round(alpha)} readOnly />
      </div>
    );
  }

  if (mode === 'css') {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn('w-full shadow-sm', className)} {...props}>
        <Input
          type="text"
          className="h-8 w-full bg-slate-100 px-2 text-xs shadow-none"
          value={`rgba(${rgb.join(', ')}, ${alpha / 100})`}
          readOnly
        />
      </div>
    );
  }

  if (mode === 'hsl') {
    const hsl = color
      .hsl()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn('flex items-center shadow-sm -space-x-px', className)}
        {...props}
      >
        {hsl.map((value, index) => (
          <Input
            key={index}
            type="text"
            value={value}
            readOnly
            className={cn(
              'h-8 rounded-r-none bg-slate-100 px-2 text-xs shadow-none',
              index && 'rounded-l-none'
            )}
          />
        ))}
        <PercentageInput value={Math.round(alpha)} readOnly />
      </div>
    );
  }

  return null;
};
