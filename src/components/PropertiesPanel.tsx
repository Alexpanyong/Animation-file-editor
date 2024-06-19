import React, { useState, useEffect, useContext } from 'react';
import { Layer, PropertyChangeMessage } from '../types';
import { useAppDispatch, useAppSelector } from '../store/store';
import { updateLayerProperty } from '../store/animationSlice';
import { WebSocketContext } from '../WebSocketProvider';

const PropertiesPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentAnimation = useAppSelector((state) => state.animation.currentAnimation);
    const currentFrame = useAppSelector((state) => state.animation.currentFrame);
    const currentLayer: Layer | any = useAppSelector((state) => state.animation.currentLayer);
    const selectedLayerIndex = useAppSelector((state) => state.animation.selectedLayerIndex);
    const currentLayerKS = currentLayer?.ks;

    const ws = useContext(WebSocketContext);

    interface Keyframe {
        currentFrame: number;
        prevKeyframe: any;
        nextKeyframe: any;
        t: number | null | undefined | any;
        s: number | number[] | null | undefined | any;
    }

    const roundedNumber = (value: any) => {
        return typeof value === 'number' ? +value.toFixed(3) : value;
    };

    const getPropertyValue = (propertyName: string, currentFrame = 0, index = 0) => {
        if (!currentLayer) {
            return null; // No layer selected
        }

        const property = currentLayerKS?.[propertyName]?.k;

        if (!property) {
            return null; // Property not found on the layer
        }

        if (typeof property === 'number') {
            // If the property is a single number, return it as an array with three elements for scale
            return property;
        } else if (Array.isArray(property) && property.length > 0) {
            if (typeof property[0] === "number") {
                // If the property is an array of numbers, return the value at the given index
                return property[index];
            } else if ("t" in property[0]) {  // Property is an array of keyframes, [{...}, {...}, {...}, ...]
                const keyframes = property as Keyframe[];
                const validKeyframes = keyframes.filter((kf) => kf.t !== null && kf.t !== undefined); // Filter out keyframes without t
                if (validKeyframes.length === 0) {
                    return null; // No valid keyframes found
                }
                const keyframeIndex = validKeyframes.findIndex(
                    (kf) => Number(kf.t) >= currentFrame
                );

                if (keyframeIndex === -1) {  // No keyframe found after the current frame, return the last keyframe value
                    const lastKeyframeValue = keyframes[keyframes.length - 1]?.s;
                    return Array.isArray(lastKeyframeValue)
                        ? lastKeyframeValue[index]
                        : [lastKeyframeValue]; // Return as a single-element array
                } else if (keyframeIndex === 0 || keyframes[0].t === undefined) {  // No keyframe found before the current frame, return the first keyframe value
                    return Array.isArray(keyframes[0].s)
                        ? keyframes[0].s[index]
                        : [keyframes[0].s]; // Return as a single-element array
                } else {
                    // Interpolate between keyframes
                    const prevKeyframe = keyframes[keyframeIndex - 1] as Keyframe;
                    const nextKeyframe = keyframes[keyframeIndex] as Keyframe;
                    const progress = (currentFrame - prevKeyframe.t!) / (nextKeyframe.t! - prevKeyframe.t!);
                    const prevValue = Array.isArray(prevKeyframe.s) ? prevKeyframe.s[index] : propertyName === 's' ? 100 : 0;
                    const nextValue = Array.isArray(nextKeyframe.s) ? nextKeyframe.s[index] : propertyName === 's' ? 100 : 0;
                    return prevValue + progress * (nextValue - prevValue); // Calculate the value and return as a single-element array
                }
            }
        }

        return null; // Default if property type is not handled
    };

    const [opacity, setOpacity] = useState<number | number[] | any>(100);
    const [positionX, setPositionX] = useState<number | number[] | any>(0);
    const [positionY, setPositionY] = useState<number | number[] | any>(0);
    const [positionZ, setPositionZ] = useState<number | number[] | any>(0);
    const [scaleX, setScaleX] = useState<number | number[] | any>(100);
    const [scaleY, setScaleY] = useState<number | number[] | any>(100);
    const [scaleZ, setScaleZ] = useState<number | number[] | any>(100);
    const [rotation, setRotation] = useState<number | number[] | any>(0);

    useEffect(() => {
        if (currentLayer !== null) {
            // Initialize properties from the selected layer
            setOpacity(getPropertyValue('o', currentFrame, 0));
            setPositionX(roundedNumber(getPropertyValue('p', currentFrame, 0)));
            setPositionY(roundedNumber(getPropertyValue('p', currentFrame, 1)));
            setPositionZ(roundedNumber(getPropertyValue('p', currentFrame, 2)));
            setScaleX(roundedNumber(getPropertyValue('s', currentFrame, 0)));
            setScaleY(roundedNumber(getPropertyValue('s', currentFrame, 1)));
            setScaleZ(roundedNumber(getPropertyValue('s', currentFrame, 2)));
            setRotation(roundedNumber(getPropertyValue('r', currentFrame, 0)));
            console.log("||+++++++++ Redux current frame property +++++++++++||");
            console.log("|| +++ Redux - currentLayer:", currentLayer);
            console.log("|| +++ Redux - currentframe:", currentFrame);
            console.log("|| +++ Redux - Opacity:", currentLayerKS?.o?.k);
            console.log("|| +++ Redux - Position :", currentLayerKS?.p?.k);
            console.log("|| +++ Redux - Scale:", currentLayerKS?.s?.k);
            console.log("|| +++ Redux - Rotation:", currentLayerKS?.r?.k);
            console.log("||++++++++++++++++++++++++++++++++++++++++++++++++++||");
            console.log("++++||||++ Selected Layer - Current Layer:", `${currentLayer.ind} - ${currentLayer.nm}`);
            console.log("++++||||++ Selected Layer - Current Frame:", currentFrame);
            console.log("++++||||++ Selected Layer - Opacity:", opacity);
            console.log("++++||||++ Selected Layer - Position X:", positionX);
            console.log("++++||||++ Selected Layer - Position Y:", positionY);
            console.log("++++||||++ Selected Layer - Position Z:", positionZ);
            console.log("++++||||++ Selected Layer - Scale X:", scaleX);
            console.log("++++||||++ Selected Layer - Scale Y:", scaleY);
            console.log("++++||||++ Selected Layer - Scale Z:", scaleZ);
            console.log("++++||||++ Selected Layer - Rotation:", rotation);
        } else {
            setOpacity(100);
            setPositionX(0);
            setPositionY(0);
            setPositionZ(0);
            setScaleX(100);
            setScaleY(100);
            setScaleZ(100);
            setRotation(0);
        }
    }, [currentLayer, currentFrame]);


    const handlePropertyChange = (propertyName: string, newValue: number, index?: number, currentFrame?: number,) => {
        // find the index of the selected layer from the current animation
        const layerIndex = currentAnimation?.layers.findIndex((layer: Layer) => layer.ind === currentLayer.ind);
        
        if (currentLayer !== null) {
            if (typeof currentLayerKS?.[propertyName]?.k[0] === 'number') {
                // An array of numbers
                dispatch(updateLayerProperty({ layerIndex, propertyName, newValue: newValue, index, currentFrame }));
            } else if (typeof currentLayerKS?.[propertyName]?.k[0] === 'object' && Array.isArray(currentLayerKS?.[propertyName]?.k[0]?.s)) {
                // An array of keyframes
                const updatedValue = [...currentLayerKS?.[propertyName]?.k[0]?.s] || [0, 0, 0]; // Get current position values
                updatedValue[index || 0] = newValue; // Update the correct index (0 for X, 1 for Y, 2 for Z)
                dispatch(updateLayerProperty({ layerIndex, propertyName, newValue: updatedValue, index, currentFrame }));
            } else {
                // A single number
                dispatch(updateLayerProperty({ layerIndex, propertyName, newValue, index, currentFrame }));
            }

            // Send property change message through WebSocket
            const message: PropertyChangeMessage = {
                type: 'propertyChange',
                payload: {
                    layerIndex: currentLayer.ind,
                    propertyName,
                    newValue,
                    index,
                },
            };

            ws?.send(JSON.stringify(message));
        }
    };

    const checkValidNumber = (value: any) => {
        return value !== null && value !== undefined && (typeof value === 'number' && !isNaN(value));
    };

    const isPropertyHasKeyframes = (property: any) => {
        return Array.isArray(property?.k) && property?.k.length > 0 && typeof property?.k[0] === 'object';
    }

    return (
        <div className="properties-panel p-4 pt-0 ml-4">
            {currentLayer !== null && (
                <>
                    <div className="properties-header text-2xl font-bold p-2 pt-0">
                        {currentLayer && `Layer ${currentLayer.ind} - ${currentLayer.nm}`}
                    </div>
                    <div className="properties-content text-sm">
                        {/* Opacity */}
                        <div className="property-item">
                            <label htmlFor="opacity" className="inline-block h-6">Opacity:</label>
                            {checkValidNumber(opacity) ? 
                                // isPropertyHasKeyframes(currentLayerKS.o) &&   // TODO: Uncomment this line after adding opacity keyframes
                                    <>
                                        <input
                                            className="relative -top-0.5 h-6"
                                            type="range"
                                            id="opacity"
                                            min="0"
                                            max="100"
                                            value={opacity}
                                            onChange={(e) => {
                                                const newValue = parseInt(e.target.value, 10);
                                                setOpacity(newValue);
                                                handlePropertyChange('o', newValue);
                                            }}
                                        />
                                        <span>{opacity}%</span>
                                    </>
                                : <span className="inline-block h-6">--</span>
                            }
                        </div>
                        
                        {/* Position */}
                        <div>
                            <div className="property-item">
                                <label htmlFor="positionX" className="inline-block h-6">Position X:</label>
                                {positionX !== null ?
                                    // isPropertyHasKeyframes(currentLayerKS.p) ?   // TODO: Uncomment this line after adding position keyframes
                                        <input
                                            className="relative -top-0.5"
                                            type="number"
                                            id="positionX"
                                            min="0"
                                            value={positionX}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setPositionX(newValue);
                                                handlePropertyChange('p', newValue, 0, currentFrame);
                                            }}
                                        />
                                        // : <span>{positionX}</span>   // TODO: Uncomment this line after adding position keyframes
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="positionY" className="inline-block h-6">Position Y:</label>
                                {positionY !== null ? 
                                    // isPropertyHasKeyframes(currentLayerKS.p) ?   // TODO: Uncomment this line after adding position keyframes
                                        <input
                                            className="relative -top-0.5"
                                            type="number"
                                            id="positionY"
                                            min="0"
                                            value={positionY}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setPositionY(newValue);
                                                handlePropertyChange('p', newValue, 1, currentFrame);
                                            }}
                                        />
                                        // : <span>{positionY}</span>   // TODO: Uncomment this line after adding position keyframes
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="positionZ" className="inline-block h-6">Position Z:</label>
                                {positionZ !== null ? 
                                    // isPropertyHasKeyframes(currentLayerKS.p) ?   // TODO: Uncomment this line after adding position keyframes
                                        <input
                                            className="relative -top-0.5"
                                            type="number"
                                            id="positionZ"
                                            min="0"
                                            value={positionZ}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setPositionZ(newValue);
                                                handlePropertyChange('p', newValue, 2, currentFrame);
                                            }}
                                        />
                                        // : <span>{positionZ}</span>   // TODO: Uncomment this line after adding position keyframes
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                        </div>

                        {/* Scale */}
                        <div>
                            <div className="property-item">
                                <label htmlFor="scaleX" className="inline-block h-6">Scale X:</label>
                                {scaleX !== null ? 
                                    <>
                                        {/* {isPropertyHasKeyframes(currentLayerKS.s) &&    // TODO: Uncomment this line after adding scale keyframes */}
                                        <input
                                            className="relative -top-0.5 h-6"
                                            type="range"
                                            id="scaleX"
                                            min="0"
                                            max="200" // Allow scaling up to 200%
                                            value={scaleX}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setScaleX(newValue);
                                                handlePropertyChange('s', newValue, 0, currentFrame);
                                            }}
                                        />
                                        {/* }   // TODO: Uncomment this line after adding scale keyframes */}
                                        <span>{scaleX}%</span>
                                    </> 
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="scaleY" className="inline-block h-6">Scale Y:</label>
                                {scaleY !== null ? 
                                    <>
                                        {/* {isPropertyHasKeyframes(currentLayerKS.s) &&    // TODO: Uncomment this line after adding scale keyframes */}
                                        <input
                                            className="relative -top-0.5 h-6"
                                            type="range"
                                            id="scaleY"
                                            min="0"
                                            max="200"
                                            value={scaleY}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setScaleY(newValue);
                                                handlePropertyChange('s', newValue, 1, currentFrame);
                                            }}
                                        />
                                        {/* }   // TODO: Uncomment this line after adding scale keyframes */}
                                        <span>{scaleY}%</span>
                                    </>
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="scaleZ" className="inline-block h-6">Scale Z:</label>
                                {scaleZ !== null ? 
                                    <>
                                        {/* {isPropertyHasKeyframes(currentLayerKS.s) &&   // TODO: Uncomment this line after adding scale keyframes */}
                                        <input
                                            className="relative -top-0.5 h-6"
                                            type="range"
                                            id="scaleZ"
                                            min="0"
                                            max="200"
                                            value={scaleZ}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setScaleZ(newValue);
                                                handlePropertyChange('s', newValue, 2, currentFrame);
                                            }}
                                        />
                                        {/* }   // TODO: Uncomment this line after adding scale keyframes */}
                                        <span>{scaleZ}%</span>
                                    </>
                                    : <span className="inline-block h-6">--</span>
                                }
                            </div>
                        </div>

                        {/* Rotation */}
                        <div className="property-item">
                            <label htmlFor="rotation" className="inline-block h-6">Rotation:</label>
                            {checkValidNumber(rotation) ? 
                                // isPropertyHasKeyframes(currentLayerKS.r) ?   // TODO: Uncomment this line after adding rotation keyframes
                                    <input
                                        className="relative -top-0.5"
                                        type="number"
                                        id="rotation"
                                        min="0"
                                        value={rotation}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setRotation(newValue);
                                            handlePropertyChange('r', newValue);
                                        }}
                                    /> 
                                    // : <span>{rotation}</span>   // TODO: Uncomment this line after adding rotation keyframes
                                : <span className="inline-block h-6">--</span>
                            }
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PropertiesPanel;

