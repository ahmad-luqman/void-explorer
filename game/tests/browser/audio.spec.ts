import { expect, test } from '@playwright/test';

test('renders layered audio with bounded peaks and a working master mute', async ({
  page,
}) => {
  await page.goto('/');
  const waveforms = await page.evaluate(async () => {
    const path = '/lib/flight/audio.ts';
    const { ExpeditionAudio } = await import(path);
    const results = [];
    for (const mode of ['flight', 'surface', 'mute']) {
      const ctx = new OfflineAudioContext(2, 48000, 48000);
      const sound = new ExpeditionAudio(ctx);
      sound.setVolume(mode === 'mute' ? 0 : 100);
      sound.update(
        {
          phase: mode === 'surface' ? 'walking' : 'flight',
          speed: 2,
          throttle: 0.8,
          altitude: 0.01,
          atmosphere: true,
          coastal: true,
          boost: true,
          pulse: false,
          autopilot: false,
          walked: 0,
          gear: 0,
          time: 0,
        },
        true,
      );
      const buffer = await ctx.startRendering();
      const data = buffer.getChannelData(0);
      let peak = 0,
        energy = 0,
        changes = 0;
      for (let i = 1; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        energy += data[i] ** 2;
        changes += Math.abs(data[i] - data[i - 1]);
      }
      results.push({
        mode,
        peak,
        rms: Math.sqrt(energy / data.length),
        changes,
      });
      sound.dispose();
    }
    return results;
  });
  for (const waveform of waveforms) {
    expect(waveform.peak).toBeLessThan(0.8);
    if (waveform.mode === 'mute') expect(waveform.peak).toBe(0);
    else {
      expect(waveform.rms).toBeGreaterThan(0.0001);
      expect(waveform.changes).toBeGreaterThan(1);
    }
  }
  expect(waveforms[0].rms).toBeGreaterThan(waveforms[1].rms);
});

test('surface events, footsteps and pause follow the actual expedition', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  const audio = () =>
    page.evaluate(
      () =>
        (
          window.__VOID_EXPLORER__!.state() as {
            audio: {
              active: boolean;
              volume: number;
              events: Record<string, number>;
              mix: { engine: number; wind: number };
            };
          }
        ).audio,
    );
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ contactReady: true });
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await expect
    .poll(audio)
    .toMatchObject({ events: { touchdown: 1 }, mix: { engine: 0 } });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await audio()).events.footstep ?? 0)
    .toBeGreaterThan(2);
  await page.keyboard.up('s');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await audio()).active).toBe(false);
  const events = (await audio()).events;
  await page.waitForTimeout(350);
  expect((await audio()).events).toEqual(events);
  expect(errors).toEqual([]);
});
