import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DragStart, DropResult } from 'react-beautiful-dnd';
import { Layer, WebSocketMessage } from '../types';
import { useAppDispatch, useAppSelector } from '../store/store';
import { addLayer, removeLayer, reorderLayers, selectLayer, updateCurrentLayer, updateKeyframeValue, updateScrubberPosition } from '../store/animationSlice';
import { WebSocketContext } from '../WebSocketProvider';

const Timeline: React.FC<{ 
    timelineContentRef: React.MutableRefObject<HTMLDivElement | null>; 
    onLayerClick: (index: number, layer: any) => void; 
}> = ({ timelineContentRef, onLayerClick }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [scrubberPosition, setScrubberPosition] = useState(0);
    const [isDroppableReady, setIsDroppableReady] = useState(false);
    const [draggingLayerIndex, setDraggingLayerIndex] = useState<number | null>(null);

    const ws = useContext(WebSocketContext);

    const dispatch = useAppDispatch();
    const animationName = useAppSelector((state) => state.animation.animationName);
    const currentAnimation = useAppSelector((state) => state.animation.currentAnimation);
    const currentFrame = useAppSelector((state) => state.animation.currentFrame);
    const currentLayer: any = useAppSelector((state) => state.animation.currentLayer);
    const selectedLayerIndex = useAppSelector((state) => state.animation.selectedLayerIndex);

    // find the index of the selected layer from the current animation
    const layerIndex = currentAnimation?.layers.findIndex((layer) => layer.ind === currentLayer?.ind);  // index of the array layers[] (start from 0)

    const handleOnDragStart = (start: DragStart) => {
        const layerIndex = parseInt(start.draggableId);
        setDraggingLayerIndex(layerIndex);
    };
    const containerRef = useRef<HTMLDivElement>(null);

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(currentAnimation!.layers);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        dispatch(reorderLayers({ sourceIndex: result.source.index, destinationIndex: result.destination.index }));
        
        // Update selectedLayerIndex after dragging
        if (selectedLayerIndex !== null) {
            dispatch(selectLayer(result.destination.index)); // Update selectedLayerIndex
            dispatch(updateCurrentLayer(items[result.destination.index]));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !timelineContentRef.current) return;

        const timelineRect = timelineContentRef.current?.getBoundingClientRect();
        const newPosition = Math.max(
            0,
            Math.min(timelineRect.width, e.clientX - timelineRect.left)
        );
        setScrubberPosition(newPosition);

        const progress = newPosition / timelineRect.width;
        const currentFrame = Math.round(progress * currentAnimation!.op); // calculate current frame (froma start from 1 instead of 0)
        dispatch(updateScrubberPosition(currentFrame));

        const message: WebSocketMessage = {
            type: 'updateScrubberPosition',
            payload: currentFrame,
        };
        ws?.send(JSON.stringify(message));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };


    const renderKeyframes = (layer: any) => {
        const ks = layer.ks || null;
        let keyframes: any[] = [];
        let propertyName: string = "";  // put the property name over the keyframe dot (o, p, s, r, etc.)
        for (const key in ks) {
            if (!ks[key]?.k) continue;
            if (!Array.isArray(ks[key]?.k[0]) && typeof ks[key]?.k[0] === "object") {  // check if it is an array of object (has keyframes)
                propertyName = key;
                for (let i = 0; i < ks[key]?.k.length; i++) {
                    keyframes.push(ks[key]?.k[i]);
                }
            }
        }
        
        return (
            <div className="keyframes">
                {keyframes.map((keyframe: any, index: number) => (
                    <Draggable key={index} draggableId={index.toString()} index={index}>
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="keyframe absolute top-2/4 w-2 h-2 -translate-y-2/4"
                                style={{ left: `${(keyframe?.t / currentAnimation!.op) * 100}%`}}
                            >
                                <div className={`keyframe-dot relative w-full h-full rounded-lg cursor-default ${
                                    layer.ind === currentLayer?.ind 
                                        ? parseInt(keyframe.t, 10) === currentFrame 
                                        ? "bg-gray-500 !w-3 !h-3 border-2 -translate-x-[20%] -translate-y-[20%]"  // when the currentFrame matches with the keyframe time
                                            : "bg-gray-100" 
                                        : "bg-gray-400"} 
                                `}></div>
                                <div className="absolute w-2 -top-[1.1rem] text-center">{propertyName}</div>
                            </div>
                        )}
                    </Draggable>
                ))}
            </div>
        );
    };

    const handleDeleteLayer = (index: number, e: any,) => {  // index of the array layers[] (start from 0)
        e.stopPropagation();  // prevent the onLayerClick event from firing

        // Reset selectedLayerIndex when a selected layer is deleted
        if (selectedLayerIndex === index) {
            dispatch(selectLayer(null));
            dispatch(updateCurrentLayer(null));
        } else if (selectedLayerIndex !== null && selectedLayerIndex > index) {
            // If the selected layer is after the deleted layer, adjust the index
            dispatch(selectLayer(selectedLayerIndex - 1));
            dispatch(updateCurrentLayer(currentAnimation?.layers[selectedLayerIndex - 1]));
        }
        dispatch(removeLayer(index));

        // Update currentLayer only if a valid layer is selected
        if (selectedLayerIndex !== null && currentAnimation?.layers[selectedLayerIndex]) {
            dispatch(updateCurrentLayer(currentAnimation.layers[selectedLayerIndex]));
        }
    };

    const handleAddLayer = useCallback(() => {
        // Generate a new unique layer ID
        const newLayer: Layer = {
            ddd: 0,
            ind: currentAnimation!.layers.length + 1, // Assign a new index
            ty: 4,
            nm: `Shape Layer ${currentAnimation!.layers.length + 1}`,
            sr: 1,
            ks: {
                o: { a: 0, k: 100, ix: 11 },
                p: { a: 0, k: [0, 0, 0], ix: 2 },
                s: { a: 0, k: [100, 100, 100], ix: 6 },
                r: { a: 0, k: 0, ix: 10 },
            },
            ao: 0,
            shapes: [],
            ip: 0,
            op: 60,
            st: 0,
            bm: 0,
        };
        dispatch(addLayer(newLayer) as any);
    }, [currentAnimation, dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsDroppableReady(true);
        }, 0); // Set isDroppableReady after a short delay to prevent the Droppable from rendering too early
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Update selectedLayerIndex when currentFrame changes
        if (currentAnimation && currentLayer) {
            const layers = currentAnimation.layers;
            for (let i = layers.length - 1; i >= 0; i--) {
                const layer = layers[i];
                if (layer.ip <= (currentFrame as number) && layer.op >= (currentFrame as number)) {
                    dispatch(selectLayer(i));
                    return; // Exit the loop once a matching layer is found
                }
            }
            dispatch(selectLayer(null)); // No layer found for the current frame
        }
    }, [currentFrame, currentAnimation]);

    useEffect(() => {
        if (animationName) {
            setScrubberPosition(0);  // Reset scrubber position when a new animation is loaded
        }
    }, [animationName]);

    useEffect(() => {
        if (currentLayer !== null) {
            console.log("====== Current Layer:", currentAnimation?.layers[(currentLayer.ind as number)]);
        }
    }, [currentLayer]);


    return (
        <DragDropContext onDragEnd={handleOnDragEnd} onDragStart={handleOnDragStart}>
            {isDroppableReady && (<Droppable droppableId="layers" direction="vertical">
                {(provided) => (
                    <div className="timeline-container p-2" ref={containerRef}>
                        {/* ... timeline header ... */}
                        <div className="timeline-header inline-block mr-6 mb-6 text-2xl font-bold text-slate-500">Timeline</div>
                        <button className="px-2 py-1 mt-1 mr-4 text-sm border border-slate-400 rounded-lg" onClick={handleAddLayer}>Add Layer</button>
                        <div className="current-layer inline-block mr-4 text-lg font-bold">
                            <span className="text-sm font-normal">Current layer:</span> {currentLayer !== null ? `${currentLayer.ind} - ${currentAnimation?.layers[(selectedLayerIndex as number)]?.nm}` : '--'}
                        </div>
                        <div className="current-frame inline-block mr-4 text-lg font-bold">
                            <span className="text-sm font-normal">Current frame:</span> <span className="text-red-500">{currentFrame}</span>
                        </div>
                        <div 
                            className="timeline relative max-h-80 overflow-x-hidden overflow-y-auto"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            <div ref={timelineContentRef} className="timeline-content relative inline max-h-[300px] overflow-y-auto">
                                {currentAnimation &&
                                    currentAnimation.layers?.map((layer: any, index: number) => (
                                        <Draggable key={layer.ind} draggableId={layer.ind.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className={`layer relative h-12 mb-1 px-3 py-0.5 text-xs cursor-default overflow-y-hidden ${
                                                        snapshot.isDragging
                                                        ? "bg-neutral-200" 
                                                        : layer.ind === currentLayer?.ind ? "bg-slate-400 text-white font-bold" : "bg-neutral-100"}`
                                                    }
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => onLayerClick(index, layer)}
                                                >
                                                    <div>{layer.ind} - {layer.nm}</div>
                                                    {currentLayer !== null && renderKeyframes(layer)}
                                                    <div className="absolute top-0.5 right-3">
                                                        <button onClick={(e) => handleDeleteLayer(index, e)} className="delete-button hover:underline hover:underline-offset-1">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                <div
                                    className="scrubber absolute bg-red-500 w-1 h-full top-0 -ml-0.5 rounded cursor-ew-resize"
                                    style={{ left: `${scrubberPosition}px` }}
                                    onMouseDown={handleMouseDown}
                                >
                                    {(currentAnimation?.layers?.length as number) > 0 && 
                                    <div className="relative flex justify-center w-10 -translate-x-[18px] -translate-y-full rounded-full">
                                        <div className="text-red-500 font-bold">{currentFrame || 0}</div>
                                    </div>}
                                </div>
                                {provided.placeholder}
                            </div>
                        </div>
                    </div>
                )}
            </Droppable>)}
        </DragDropContext>
    );
};

export default Timeline;

