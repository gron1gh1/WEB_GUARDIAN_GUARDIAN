import React, { useState, useEffect, useRef } from "react";
import { Button, Spin, Row, Col, Dropdown,Menu } from "antd";
import { LoadingOutlined, DownOutlined } from "@ant-design/icons";
import { IClickPos } from "./Interface";
import ConvexHull_2D from "./ConvexHull";
import { CameraRTSPUrl } from "./Util";
type CanvasContext = CanvasRenderingContext2D | null | undefined;
const ScreenX: number = 854;
const ScreenY: number = 480;

function drawPoint(ctx: CanvasContext, position: IClickPos) {
  if (ctx) ctx.strokeStyle = "rgb(0, 0, 255)";
  ctx?.beginPath();
  ctx?.arc(position.X, position.Y, 2, 0, 2 * Math.PI, true);
  ctx?.fill();
  ctx?.closePath();
  ctx?.stroke();
}

function drawLine(ctx: CanvasContext, start: IClickPos, end: IClickPos) {
  if (ctx) ctx.strokeStyle = "rgb(255, 0, 0)";
  ctx?.beginPath();
  ctx?.moveTo(start.X, start.Y);
  ctx?.lineTo(end.X, end.Y);
  ctx?.closePath();
  ctx?.stroke();
}
interface IDetectionAreaBox {
  CameraURL: string;
}
function DetectionAreaBox({ CameraURL }: IDetectionAreaBox) {
  const [ClickPos, SetPos] = useState<IClickPos[]>([]);
  const [ConvexHullPos, SetConvexHull] = useState<IClickPos[]>([]);
  const [Spinning, SetSpinning] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCanvasClick = (e: MouseEvent) => {
    SetPos(ClickPos.concat({ X: e.offsetX, Y: e.offsetY }));
  };
  const onClearBtn = () => {
    let canvas: HTMLCanvasElement | null = canvasRef.current;
    let ctx: CanvasContext = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, ScreenX, ScreenY);
    SetPos([]);
  };
  useEffect(() => {
    let canvas: HTMLCanvasElement | null = canvasRef.current;
    canvas?.addEventListener("click", onCanvasClick);

    if (ClickPos.length > 0) SetConvexHull(ConvexHull_2D(ClickPos));

    return () => {
      canvas?.removeEventListener("click", onCanvasClick);
    };
  }, [ClickPos]);

  useEffect(() => {
    let canvas: HTMLCanvasElement | null = canvasRef.current;
    let ctx: CanvasContext = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, ScreenX, ScreenY);
    for (var i = 0; i < ConvexHullPos.length; i++) {
      // 점 띄우기
      drawPoint(ctx, ConvexHullPos[i]);
    }
    if (ConvexHullPos.length > 2) {
      // 라인 그리기
      for (var i = 0; i < ConvexHullPos.length - 1; i++)
        drawLine(ctx, ConvexHullPos[i], ConvexHullPos[i + 1]);
      drawLine(ctx, ConvexHullPos[ConvexHullPos.length - 1], ConvexHullPos[0]);
    }
  }, [ConvexHullPos]);
  return (
    <div>
      <Spin
        tip="Camera Loading"
        style={{
          
          color: "#607D8B",
          position: "absolute",
          width: `${ScreenX}px`,
          height: `${ScreenY}px`,
        }}
        spinning={Spinning}
        indicator={
          <LoadingOutlined style={{ fontSize: 24, color: "#607D8B" }} spin />
        }
      >
        <img
          onLoad={() => SetSpinning(false)}
          onError={(e) => {
            e.currentTarget.src = "";
            e.currentTarget.src = CameraRTSPUrl[0];
          }}
          style={{
            position: "relative",
            left: 0,
            top: 0,
            width: `${ScreenX}px`,
            height: `${ScreenY}px`,
          }}
          src={CameraURL}
        />
        <canvas
          width={`${ScreenX}`}
          height={`${ScreenY}`}
          ref={canvasRef}
          style={{ cursor: "pointer", position: "absolute", left: 0, top: 0 }}
        />
      </Spin>
      <Button type="primary" onClick={onClearBtn}>
        초기화
      </Button>
    </div>
  );
}
const menu = (
  <Menu>
    <Menu.Item key="0">
      1st menu item
    </Menu.Item>
    <Menu.Item key="1">
    2nd menu item
    </Menu.Item>
    <Menu.Item key="3">3rd menu item</Menu.Item>
  </Menu>
);
export default function Setting() {
  return (
    <Row>
      <Col sm={ScreenY} style={{position:'relative',background:'#C8D2D7'}}>
          <DetectionAreaBox CameraURL={CameraRTSPUrl[0]} />
      </Col>
      <Col>
        <Dropdown overlay={menu} trigger={["click"]}>
          <a className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
            Click me <DownOutlined />
          </a>
        </Dropdown>
      </Col>
    </Row>
  );
}
