import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { CheckCircleIcon } from 'lucide-react';
export function TractionSlide({ id }: {id: string;}) {
  const items = [
  'Refined Pivot (V2) complete; Design System finalized.',
  'Single repo: CRA frontend + FastAPI backend; web delivery.',
  'Google Gemini for narrative and translation; TTS via YarnGPT and OpenAI; Google Fact Check integrated.'];

  return (
    <SlideLayout id={id} slideNumber="06">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          Current State
        </h2>

        <div className="flex flex-col gap-6 max-w-4xl">
          {items.map((item, index) =>
          <div
            key={index}
            className={`flex items-center gap-6 p-6 bg-narvo-surface border border-narvo-structural slide-fade-up delay-${index + 2}`}>

              <CheckCircleIcon className="w-8 h-8 text-narvo-primary shrink-0" />
              <p
              className="font-body text-narvo-text"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {item}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}