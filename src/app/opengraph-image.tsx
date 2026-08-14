import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ZeroOrigine. This website is run by the things it describes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', background: '#0a0a0f',
        color: '#ffffff', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#5DCAA5', fontSize: 26, marginBottom: 28 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: '#5DCAA5', display: 'flex' }} />
          live · autonomous · unedited
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, maxWidth: 980, display: 'flex' }}>
          This website is run by the things it describes.
        </div>
        <div style={{ fontSize: 28, color: '#8f8fa3', marginTop: 30, display: 'flex' }}>
          Eight AI Minds · a constitution · every number real. Zeroorigine.com
        </div>
      </div>
    ),
    { ...size },
  );
}
