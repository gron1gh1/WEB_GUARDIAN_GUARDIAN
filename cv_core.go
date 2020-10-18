package main

import (
	"encoding/json"
	"fmt"
	"image"
	"log"
	"strings"
	"time"

	gosocketio "github.com/graarh/golang-socketio"
	"github.com/gron1gh1/queue"
	"gocv.io/x/gocv"
)

func DetectStart(CapUrl string, Server *gosocketio.Server, DetectPointChannel chan DetectPointInfo) {
	cap, err := gocv.OpenVideoCapture(CapUrl)
	if err != nil {
		fmt.Printf("Error opening capture device")
		return
	}
	defer cap.Close()

	// Motion Init
	mog2 := gocv.NewBackgroundSubtractorMOG2()
	defer mog2.Close()

	// YOLO Init
	net := gocv.ReadNet("./assets/yolov4.weights", "./assets/yolov4.cfg")
	defer net.Close()
	net.SetPreferableBackend(gocv.NetBackendType(gocv.NetBackendDefault))
	net.SetPreferableTarget(gocv.NetTargetType(gocv.NetTargetCPU))
	classes := ReadCOCO()
	OutputNames := getOutputsNames(&net)

	img := gocv.NewMat()
	defer img.Close()

	oriImg := gocv.NewMat()
	defer oriImg.Close()
	FrameChannel := make(chan gocv.Mat)
	type IYoloData struct {
		original gocv.Mat
		roi      gocv.Mat
	}
	YoloChannel := make(chan IYoloData)

	type ILiner struct {
		img   gocv.Mat
		rects []image.Rectangle
	}
	LinerChannel := make(chan []image.Rectangle)

	type IDetect struct {
		Thumbnail []byte `json:"thumbnail"`
		Content   string `json:"content"`
		Time      string `json:"time"`
	}

	var DPI DetectPointInfo
	go func() { // Set DetectPointInfo
		for D := range DetectPointChannel {
			DPI = DetectPointInfo{D.ViewSize, TransPos(D, 0, encodingSize)}
			fmt.Printf("DPI %v\n", DPI)
			break
		}
	}()
	var NowTime string
	var detectClass []string
	var detectBoxes []image.Rectangle
	movingQ := queue.New()
	go func() { // Yolo Thread
		for YoloData := range YoloChannel {
			NowTime = time.Now().Format("2006-01-02 15:04:05")
			detectClass, detectBoxes = YoloDetect(&net, YoloData.roi, &YoloData.original, 0.45, 0.5, OutputNames, classes)

			fmt.Printf("class : %v %v\n ", detectClass, YoloData.original.Empty())
			if len(detectClass) > 0 && !YoloData.original.Empty() {
				buf, _ := gocv.IMEncode(".jpg", YoloData.original)
				b, _ := json.Marshal(IDetect{buf, strings.Join(detectClass, ","), NowTime})
				Server.BroadcastToAll("detect", string(b))
			}
			YoloData.original.Close()
			YoloData.roi.Close()
		}
	}()

	Result := gocv.NewMat()
	defer Result.Close()

	mask := gocv.NewMat()
	defer mask.Close()

	go func() { // Liner Thread

		Prev := gocv.NewMat()
		defer Prev.Close()

		PrevPts := gocv.NewMat()
		defer PrevPts.Close()

		criteria := gocv.NewTermCriteria(gocv.Count+gocv.EPS, 10, 0.3)

		for LinerData := range LinerChannel {

			for {
				//fmt.Printf("q: %d\n", movingQ.Length())
				if movingQ.Length() > 0 {
					img := movingQ.Pop().(gocv.Mat)
					if !Prev.Empty() {
						//fmt.Printf("RC %v\n",PrevPts.Size())
						MotionLiner(Prev, img, &PrevPts, &mask, criteria, LinerData)
						if !mask.Empty() {
							gocv.Add(img, mask, &Result)
						}
					}
					Prev = img.Clone()
					img.Close()
					//LinerData.img.Close()
				} else {
					break
				}
			}
		}
	}()
	go func() { // Motion Detect Thread
		var startTime time.Time
		var startFlag bool

		imgDelta := gocv.NewMat()
		defer imgDelta.Close()

		imgThresh := gocv.NewMat()
		defer imgThresh.Close()

		mask := gocv.NewMatWithSize(encodingSize.Y, encodingSize.X, gocv.MatTypeCV8UC3)
		defer mask.Close()
		resultROI := gocv.NewMatWithSize(encodingSize.Y, encodingSize.X, gocv.MatTypeCV8UC3)
		defer resultROI.Close()

		// var resultROI gocv.Mat
		// defer resultROI.Close()

		/*
					panic: runtime error: index out of range [250] with length 32

			goroutine 39 [running]:
			github.com/sheerun/queue.(*Queue).Append(0xc000086b40, 0x79dd80, 0x7f36f84b34c0)
			        /home/gron1gh1/go/src/github.com/sheerun/queue/queue.go:97 +0x3b0
			main.DetectStart.func4(0xc0000b6540, 0xc00014a1e0, 0xc0000b4138, 0xc000086b40, 0xc0000b65a0, 0xc0000a6d20, 0xc0000b6600, 0xc0000b4150, 0xc0000a6d00, 0xc000148130, ...)
			        /home/gron1gh1/code-server-gocv/data/code-server/config/workspace/WEB_BACK/cv_core.go:165 +0x3ae
		*/
		timeSeq := false
		for img := range FrameChannel {
			DetectArea(img, mask, &resultROI, DPI)

			motionCnt := MotionDetect(resultROI, imgDelta, imgThresh, mog2)
			if motionCnt > 0 { // 움직임 감지됐으면

				if !startFlag { // 움직임 감지 시작 시간 대입
					startFlag = true
					startTime = time.Now()
				} else {
					ingTime := float32(time.Since(startTime) / time.Second)
					if ingTime > 0 {

						if !timeSeq && ingTime > 2.0 {
							fmt.Println("움직임 감지 2초")
							timeSeq = true
							movingQ.Clean()
							//	fmt.Printf("moving Q: %d\n", movingQ.Length())
							go func(original gocv.Mat, roi gocv.Mat) {
								YoloChannel <- IYoloData{original, roi}
							}(img.Clone(), resultROI.Clone())
						} else if timeSeq && ingTime > 2.0 {
							//fmt.Printf("moving Q: %d\n", movingQ.Length())
							movingQ.Append(img.Clone()) // 나중에 mutex
							if len(detectBoxes) > 0 {
								LinerChannel <- detectBoxes
							}
						}
					}

				}
			} else { // 움직임 감지없으면
				if startFlag {
					startFlag = false
					if timeSeq {
						timeSeq = false
						fmt.Println("움직임 감지 끝")

						if !Result.Empty() {
							buf, _ := gocv.IMEncode(".jpg", Result)
							b, _ := json.Marshal(IDetect{buf, strings.Join(detectClass, ","), NowTime})
							Server.BroadcastToAll("detect", string(b))
						}
					}
				}
			}
			img.Close()
		}

	}()

	for {
		if ok := cap.Read(&img); !ok {
			log.Println("RTSP Close")
			cap, _ = gocv.OpenVideoCapture(CapUrl)
			log.Println("RTSP ReStart")
		}
		if img.Empty() {
			log.Println("Frame Close")
			continue
		}

		gocv.Resize(img, &img, encodingSize, 0, 0, 0)
		buf, _ := gocv.IMEncode(".jpg", img)

		ViewChannel <- buf
		if DPI.ViewSize.X > 0 && DPI.ViewSize.Y > 0 { // 좌표 설정 돼있을 경우 이거 지우면 프로그램 안멈춤.

			FrameChannel <- img.Clone()
		}
		gocv.WaitKey(1)
	}
}
