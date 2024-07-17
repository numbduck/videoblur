import React, { useEffect, useRef, useState } from "react";

import { Layer, Rect, Stage, Transformer } from "react-konva";

import samplevid from "../assets/sample2.mp4";

import * as cocoSsd from "@tensorflow-models/coco-ssd";

import "@tensorflow/tfjs";

const VideoWithBoundingBox = () => {
  const videoRef = useRef(null);

  const stageRef = useRef(null);

  const rectRef = useRef(null);

  const overlayRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  const [detectionInterval, setDetectionInterval] = useState([]);

  const [createBbox, setCreateBbox] = useState(true);

  const [predictions, setPredictions] = useState([]);

  const [boxCenter, setBoxCenter] = useState();

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [leastDiff, setLeastDiff] = useState({ distance: 10000, index: null });

  const [rectProps, setRectProps] = useState({
    x: 50,

    y: 50,

    width: 100,

    height: 100,

    stroke: "red",

    strokeWidth: 2,

    draggable: true,
  });

  // console.log("pre", predictions)

  const updateDimensions = () => {
    if (videoRef.current) {
      const { offsetWidth: width, offsetHeight: height } = videoRef.current;

      setDimensions({ width, height });
    }
  };

  const predictObject = async () => {
    if (videoRef.current) {
      const model = await cocoSsd.load();

      const predictionsModel = await model.detect(videoRef.current);

      console.log(
        `predictionsModel`,
        predictionsModel,
        videoRef?.current?.currentTime
      );

      setPredictions((prev) => [
        ...prev,
        [...predictionsModel, { timeStamp: videoRef?.current?.currentTime }],
      ]);
    }
  };

  console.log("predictionsModel 1", predictions, videoRef);

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);

    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // console.log("ended", videoRef.current?.ended)

  useEffect(() => {
    const handlePlayPause = () => {
      if (videoRef.current?.paused) {
        clearInterval(detectionInterval);

        setDetectionInterval(null);

        setIsVideoPlaying(false);
      } else if (videoRef.current?.ended) {
        setIsVideoPlaying(false);

        clearInterval(detectionInterval);

        setDetectionInterval(null);

        // setDetectionInterval(setInterval(predictObject, 15000));
      } else {
        setIsVideoPlaying(true);

        setDetectionInterval(setInterval(predictObject, 1000));
      }
    };

    videoRef.current.addEventListener("play", handlePlayPause);

    videoRef.current.addEventListener("pause", handlePlayPause);

    return () => {
      videoRef.current.removeEventListener("play", handlePlayPause);

      videoRef.current.removeEventListener("pause", handlePlayPause);
    };
  }, [isVideoPlaying]);

  // useEffect(() => {

  //     if (!videoRef.current.paused) {

  //         setDetectionInterval(setInterval(predictObject, 500));

  //     } else {

  //         clearInterval(detectionInterval);

  //         setDetectionInterval(null);

  //     }

  //     return () => clearInterval(detectionInterval);

  // }, []);

  const handleTransformEnd = () => {
    const node = rectRef.current;

    const scaleX = node.scaleX();

    const scaleY = node.scaleY();

    // Reset scale to 1

    node.scaleX(1);

    node.scaleY(1);

    setRectProps({
      ...rectProps,

      x: node.x(),

      y: node.y(),

      width: node.width() * scaleX,

      height: node.height() * scaleY,
    });

    setBoxCenter({
      xBboxCenter: node.x() + (node.width() * scaleX) / 2,

      yBboxCenter: node.y() + (node.height() * scaleY) / 2,
    });

    // console.log({

    //     x: node.x(),

    //     y: node.y(),

    //     width: node.width() * scaleX,

    //     height: node.height() * scaleY,

    // });
  };

  const handleDragEnd = () => {
    const node = rectRef.current;

    const scaleX = node.scaleX();

    const scaleY = node.scaleY();

    setRectProps({
      ...rectProps,

      x: node.x(),

      y: node.y(),
    });

    setBoxCenter({
      xBboxCenter: node.x() + (node.width() * scaleX) / 2,

      yBboxCenter: node.y() + (node.height() * scaleY) / 2,
    });

    // console.log({

    //     x: node.x(),

    //     y: node.y(),

    //     width: node.width(),

    //     height: node.height(),

    // });
  };

  // console.log(boxCenter, "box center");

  // const selectedObject = predictions?.map((item, index) => {

  //     const itemCenter = {

  //         xBboxCenter: item?.bbox[0] + item?.bbox[2] / 2,

  //         yBboxCenter: item?.bbox[1] + item?.bbox[3] / 2,

  //     };

  //     const distance = Math.sqrt(

  //         Math.pow(boxCenter.xBboxCenter - itemCenter.xBboxCenter, 2) +

  //         Math.pow(boxCenter.yBboxCenter - itemCenter.yBboxCenter, 2)

  //     );

  //     if (distance < leastDiff.distance) {

  //         setLeastDiff({ distance: distance, index: index });

  //     }

  //     console.log("distance in looop and index", { distance, index });

  //     return distance;

  // });

  // console.log(selectedObject, "object");

  // console.log("leastDiff", leastDiff);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button onClick={() => videoRef.current.play()}>Play</button>

        <button onClick={() => videoRef.current.pause()}>Pause</button>
      </div>

      <div style={{ position: "relative", width: "640px", height: "360px" }}>
        <video
          ref={videoRef}
          src={samplevid}
          controls
          style={{ width: "100%", height: "100%" }}
        />

        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Layer>
            <Rect
              {...rectProps}
              ref={rectRef}
              onTransformEnd={handleTransformEnd}
              onDragEnd={handleDragEnd}
            />

            <Transformer
              ref={(tr) => {
                tr && tr.nodes([stageRef.current.findOne("Rect")]);
              }}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize

                if (newBox.width < 30 || newBox.height < 30) {
                  return oldBox;
                }

                return newBox;
              }}
            />
          </Layer>
        </Stage>

        <canvas
          style={{ position: "absolute", width: "640px", height: "360px" }}
        ></canvas>
      </div>
    </div>
  );
};

export default VideoWithBoundingBox;
