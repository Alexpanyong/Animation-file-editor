import React, { useRef, useEffect, useState } from 'react';
import lottie from 'lottie-web';
import { useAppSelector } from "../store/store";
import _ from 'lodash';

const AnimationCanvas: React.FC<{ timelineContentRef: React.MutableRefObject<HTMLDivElement | null> }> = ({ timelineContentRef }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentAnimation = useAppSelector((state) => state.animation.currentAnimation);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const currentFrame = useAppSelector((state) => state.animation.currentFrame);
    const anim = useRef<any>(null);

    useEffect(() => {
        const loadAnimation = async () => {
            setError(null); // Clear any previous errors
            if (canvasRef.current && currentAnimation) {
                setIsLoading(true); // Start loading
                try {
                    const animationDataCopy = _.cloneDeep(currentAnimation);
                    anim.current = lottie.loadAnimation({
                        container: canvasRef.current,
                        renderer: 'svg',
                        loop: true,
                        autoplay: false,
                        animationData: animationDataCopy
                    });
                } catch (error) {
                    console.error("Error loading animation:", error);
                    setError("Error loading animation. Please try again.");
                } finally {
                    setIsLoading(false); // Finish loading
                }
            }
        }

        loadAnimation();

        return () => {
            if (anim.current) {
                anim.current.destroy(); // Clean up the animation on unmount
            }
        };
    }, [currentAnimation]);

    useEffect(() => {
        if (anim.current) {
            anim.current.goToAndStop(currentFrame, true);
        }
    }, [currentFrame]);

    return (
        <div className="animation-canvas max-w-xl max-h-full">
            {isLoading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <div ref={canvasRef} className=' min-w-80 bg-gray-100 border border-slate-300 rounded-lg' />
        </div>
    );
};

export default AnimationCanvas;
