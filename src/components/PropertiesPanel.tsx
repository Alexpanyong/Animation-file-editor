import React, { useState, useEffect, useContext } from 'react';
import { Layer, PropertyChangeMessage } from '../types';
import { useAppDispatch, useAppSelector } from '../store/store';
import { updateLayerProperty } from '../store/animationSlice';
import { WebSocketContext } from '../WebSocketProvider';

const PropertiesPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentFrame = useAppSelector((state) => state.animation.currentFrame);
    const currentLayer: Layer | any = useAppSelector((state) => state.animation.currentLayer);
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
            console.log("||+++++++++ current frame property +++++++++++||");
            console.log("|| ++++ Current frame:", currentFrame);
            console.log("|| ++++ Opacity:", currentLayerKS?.o?.k);
            console.log("|| ++++ Position :", currentLayerKS?.p?.k);
            console.log("|| ++++ Scale:", currentLayerKS?.s?.k);
            console.log("|| ++++ Rotation:", currentLayerKS?.r?.k);
            console.log("||++++++++++++++++++++++++++++++++++++++++++++||");
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

    useEffect(() => {  
        console.log("+++++++++||||+++++++++ Current Frame:", currentFrame);
        console.log("+++++++++||||+++++++++ Opacity:", opacity);
        console.log("+++++++++||||+++++++++ Position X:", positionX);
        console.log("+++++++++||||+++++++++ Position Y:", positionY);
        console.log("+++++++++||||+++++++++ Position Z:", positionZ);
        console.log("+++++++++||||+++++++++ Scale X:", scaleX);
        console.log("+++++++++||||+++++++++ Scale Y:", scaleY);
        console.log("+++++++++||||+++++++++ Scale Z:", scaleZ);
        console.log("+++++++++||||+++++++++ Rotation:", rotation);
    }, [currentFrame]);

    const handlePropertyChange = (propertyName: string, newValue: number, index?: number, currentFrame?: number,) => {
        if (currentLayer !== null) {
            if (propertyName === 'p') {
                if (typeof currentLayerKS?.p?.k[0] === 'number') {
                    // Position is a single value, create a new array
                    dispatch(updateLayerProperty({ layerIndex: currentLayer.ind, propertyName, newValue: [newValue, newValue, newValue], currentFrame }));
                } else if (typeof currentLayerKS?.p?.k[0] === 'object' && Array.isArray(currentLayerKS?.p?.k[0]?.s)) {
                    const updatedPositionValue = [...currentLayerKS?.p?.k[0]?.s] || [0, 0, 0]; // Get current position values
                    updatedPositionValue[index || 0] = newValue; // Update the correct index (0 for X, 1 for Y, 2 for Z)
                    dispatch(updateLayerProperty({ layerIndex: currentLayer.ind, propertyName, newValue: updatedPositionValue, currentFrame }));
                } else {
                    dispatch(updateLayerProperty({ layerIndex: currentLayer.ind, propertyName, newValue, currentFrame }));
                }
            } else if (propertyName === 's') {
                let updatedScaleValue;
                if (Array.isArray(currentLayerKS?.s?.k[0]?.s)) {
                    // Scale is an array, create a copy and update
                    updatedScaleValue = [...currentLayerKS?.s.k[0].s];
                } else {
                    // Scale is a single value, create a new array
                    updatedScaleValue = [100, 100, 100];
                }
                updatedScaleValue[index || 0] = newValue; // Update the correct index (0 for X, 1 for Y, 2 for Z)
                dispatch(updateLayerProperty({ layerIndex: currentLayer.ind, propertyName, newValue: updatedScaleValue, currentFrame }));
            } else {
                dispatch(updateLayerProperty({ layerIndex: currentLayer.ind, propertyName, newValue, currentFrame }));
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
        return value !== null || value !== undefined || (typeof value === 'number' && !isNaN(value));
    };

    return (
        <div className="properties-panel p-4 pt-0 ml-4">
            {currentLayer !== null && (
                <>
                    <div className="properties-header text-2xl font-bold p-2 pt-0">
                        {currentLayer && `Layer ${currentLayer.ind} - ${currentLayer.nm}`}
                    </div>
                    <div className="properties-content text-sm">
                        {/* Opacity */}
                        {checkValidNumber(opacity) &&
                        <div className="property-item">
                            <label htmlFor="opacity">Opacity:</label>
                            <input
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
                        </div>}
                        
                        {/* Position */}
                        <div>
                            <div className="property-item">
                                <label htmlFor="positionX">Position X:</label>
                                {positionX !== null 
                                    ? <input
                                        type="number"
                                        id="positionX"
                                        min="0"
                                        value={positionX}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setPositionX(newValue);
                                            handlePropertyChange('p', newValue, 0);
                                        }}
                                    /> 
                                    : "--"
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="positionY">Position Y:</label>
                                {positionY !== null 
                                    ? <input
                                        type="number"
                                        id="positionY"
                                        min="0"
                                        value={positionY}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setPositionY(newValue);
                                            handlePropertyChange('p', newValue, 1);
                                        }}
                                    />
                                    : "--"
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="positionZ">Position Z:</label>
                                {positionZ !== null 
                                    ? <input
                                        type="number"
                                        id="positionZ"
                                        min="0"
                                        value={positionZ}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setPositionZ(newValue);
                                            handlePropertyChange('p', newValue, 2);
                                        }}
                                    />
                                    : "--"
                                }
                            </div>
                        </div>

                        {/* Scale */}
                        <div>
                            <div className="property-item">
                                <label htmlFor="scaleX">Scale X:</label>
                                {scaleX !== null 
                                    ? <>
                                        <input
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
                                        <span>{scaleX}%</span>
                                    </> 
                                    : "--"
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="scaleY">Scale Y:</label>
                                {scaleY !== null 
                                    ? <>
                                        <input
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
                                        <span>{scaleY}%</span>
                                    </>
                                    : "--"
                                }
                            </div>
                            
                            <div className="property-item">
                                <label htmlFor="scaleZ">Scale Z:</label>
                                {scaleZ !== null 
                                    ? <>
                                        <input
                                            type="range"
                                            id="scaleZ"
                                            min="0"
                                            max="200"
                                            value={scaleZ}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setScaleY(newValue);
                                                handlePropertyChange('s', newValue, 2, currentFrame);
                                            }}
                                        />
                                        <span>{scaleZ}%</span>
                                    </>
                                    : "--"
                                }
                            </div>
                        </div>

                        {/* Rotation */}
                        <div className="property-item">
                            <label htmlFor="rotation">Rotation:</label>
                            {rotation !== null 
                                ? <input
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
                                : "--"
                            }
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PropertiesPanel;

