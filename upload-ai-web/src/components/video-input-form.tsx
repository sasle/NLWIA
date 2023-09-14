import { FileVideo, Upload } from "lucide-react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react"
import { loadFFMpeg } from '@/lib/ffmpeg'
import { fetchFile } from "@ffmpeg/util"
import { api } from "@/lib/axios"

export function VideoInputForm() {
    const [video, setVideo] = useState<File | null>(null)
    const promptInputRef = useRef<HTMLTextAreaElement>(null)
    function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
        const { files } = e.currentTarget

        if (!files) {
            return;
        }

        const selectedFile = files[0]

        setVideo(selectedFile)
    }

    async function convertVideoToAudio(video: File) {
        const ffmpeg = await loadFFMpeg()
        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3'
        ])

        const data = await ffmpeg.readFile('output.mp3')

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        })

        return audioFile
    }

    async function handleGenerateVideo(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const prompt = promptInputRef.current?.value

        if (!video) {
            return
        }

        const audioFile = await convertVideoToAudio(video)

        const data = new FormData()

        data.append('file', audioFile)

        const response = await api.post('/videos', data)

        const videoId = response.data.video.id

        await api.post(`/videos/${videoId}/transcription`, {
            prompt
        })

        console.log('finalizou')
    }

    const previewURL = useMemo(() => {
        if (!video) {
            return null;
        }

        return URL.createObjectURL(video)
    }, [video])

    return (
        <form onSubmit={handleGenerateVideo} className="space-y-6">
            <label htmlFor="video" className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5">{previewURL ? (<video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />) : (<><FileVideo className="w-4 h-4" />Upload video</>)}</label>
            <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />
            <Separator />
            <div className="space-y-2">
                <Label htmlFor="transcription_prompt">Transcription prompt</Label>
                <Textarea ref={promptInputRef} id="transcription_prompt" className="h-20 leading-relaxed resize-none" placeholder="Include key messages mentioned in the video separated by commas."></Textarea>
            </div>
            <Button type="submit" className="w-full">Upload video <Upload className="w-4 h-4 ml-2" /></Button>
        </form>
    )
}
