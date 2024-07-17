import React, { useEffect, useRef, useState } from "react";

import { Layer, Rect, Stage, Transformer } from "react-konva";

import samplevid from "../assets/fightafighti.mp4";

import * as cocoSsd from "@tensorflow-models/coco-ssd";

import "@tensorflow/tfjs";

const VideoWithBoundingBox = () => {
  const videoRef = useRef(null);

  const stageRef = useRef(null);

  const rectRef = useRef(null);

  const overlayRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });
  const [objectDescription, setObjectDescription] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [detectionInterval, setDetectionInterval] = useState([]);

  const [createBbox, setCreateBbox] = useState(false);

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

  useEffect(() => {
    const tempObj = predictions?.map((each) => each?.[leastDiff?.index]?.bbox);

    console.log("tempObj", tempObj);
    const temp2Obj = tempObj[tempObj?.length - 1];
    // setObjectDescription(tempObj);
    setObjectDescription({
      left: temp2Obj?.[0],
      top: temp2Obj?.[1],
      width: temp2Obj?.[2],
      height: temp2Obj?.[3],
    });
    console.log(objectDescription, "Temp Objecct dispplay");
    console.log("predictionsModel 1", predictions, videoRef);
  }, [predictions]);

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

  function handleCreateBoundingBox() {
    setCreateBbox(true);
  }

  function handleBoundingBoxSubmit() {
    const takeIndex =
      Math.floor(videoRef?.current?.currentTime) > 1
        ? Math.floor(videoRef?.current?.currentTime) - 1
        : 0;
    predictions[takeIndex]?.map((item, index) => {
      const itemCenter = {
        xBboxCenter: item?.bbox?.[0] + item?.bbox?.[2] / 2,

        yBboxCenter: item?.bbox?.[1] + item?.bbox?.[3] / 2,
      };
      // console.log(itemCenter, "Center got");

      const distance = Math.sqrt(
        Math.pow(boxCenter?.xBboxCenter - itemCenter?.xBboxCenter, 2) +
        Math.pow(boxCenter?.yBboxCenter - itemCenter?.yBboxCenter, 2)
      );

      if (distance < leastDiff?.distance) {
        setLeastDiff({ distance: distance, index: index });
      }
    });
  }
  // console.log(videoRef?.current?.currentTime,"Videoref ");

  // console.log(selectedObject, "object");

  console.log("leastDiff", leastDiff);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button onClick={() => videoRef.current.play()}>Play</button>

        <button onClick={() => videoRef.current.pause()}>Pause</button>
        <button onClick={handleCreateBoundingBox}>Create bounding box</button>

        <button onClick={handleBoundingBoxSubmit}>Submit</button>
      </div>

      <div style={{ position: "relative", width: "1280px", height: "720px" }}>
        <div
          style={{
            position: "absolute",
            top: `${objectDescription?.top}px`,
            left: `${objectDescription?.left}px`,
            height: `${objectDescription?.height}px`,
            width: `${objectDescription?.width}px`,
            // color: "black",
            // filter: "",
            backdropFilter: "blur(15px)",
            // backgroundColor: "black",
          }}
        />

        <video
          ref={videoRef}
          src={samplevid}
          controls
          style={{ width: "100%", height: "100%" }}
        />

        {createBbox && (
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
        )}
      </div>
    </div>
  );
};

export default VideoWithBoundingBox;