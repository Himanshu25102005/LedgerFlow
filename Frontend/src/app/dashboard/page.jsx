import React from 'react'
import MagicBento from '@/components/MagicBento'
import DotGrid from '@/components/DotGrid'

const Page = () => {
    return (
        /* 1. Main relative container that fills the screen */
        <div className="relative w-full h-screen overflow-hidden bg-black">
            
            {/* 2. Background Layer: Absolute and Z-index 0 */}
            <div className="absolute inset-0 z-0">
                <DotGrid
                    dotSize={5}
                    gap={15}
                    baseColor="#271E37"
                    activeColor="#5227FF"
                    proximity={120}
                    shockRadius={250}
                    shockStrength={5}
                    resistance={750}
                    returnDuration={1.5}
                />
            </div>

            {/* 3. Content Layer: Relative and Z-index 10 */}
            <div className="relative z-10 flex h-full items-center justify-center pointer-events-none">
                {/* 4. Ensure the Bento box itself can still be clicked/interacted with */}
                <div className="pointer-events-auto">
                    <MagicBento
                        textAutoHide={true}
                        enableStars
                        enableSpotlight
                        enableBorderGlow={true}
                        enableTilt={false}
                        enableMagnetism={false}
                        clickEffect
                        spotlightRadius={400}
                        particleCount={12}
                        glowColor="132, 0, 255"
                        disableAnimations={false}
                    />
                </div>
            </div>
        </div>
    )
}

export default Page