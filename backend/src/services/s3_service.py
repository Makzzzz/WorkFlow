import os
import uuid
import aioboto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}

class S3StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint = os.getenv("S3_ENDPOINT")
        self.bucket = os.getenv("S3_BUCKET_NAME")
        self.region = os.getenv("S3_REGION", "ru-3")
        self.access_key = os.getenv("S3_ACCESS_KEY")
        self.secret_key = os.getenv("S3_SECRET_KEY")

    async def upload_files(self, files: list[UploadFile], folder: str = "solutions") -> str:
        if not files:
            raise HTTPException(status_code=400, detail="Файлы не переданы")

        batch_folder = f"{folder}/{uuid.uuid4()}"
        
        for file in files:
            if not file.filename:
                continue
                
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if f".{ext}" not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {file.filename}")
            if file.content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(status_code=400, detail=f"Некорректный MIME-тип: {file.filename}")

            object_name = f"{batch_folder}/{uuid.uuid4()}.{ext}"
            file_content = await file.read()
            
            try:
                async with self.session.client(
                    "s3",
                    endpoint_url=self.endpoint,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                ) as client:
                    await client.put_object(
                        Bucket=self.bucket,
                        Key=object_name,
                        Body=file_content,
                        ContentType=file.content_type or "application/octet-stream"
                    )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
                
        return batch_folder
    
    async def list_files_in_folder(self, folder_path: str) -> list[str]:
        if not folder_path:
            return []
        prefix = folder_path if folder_path.endswith('/') else f"{folder_path}/"

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            ) as client:
                response = await client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка чтения папки из S3: {str(e)}")

        urls = []
        if 'Contents' in response:
            for obj in response['Contents']:
                full_url = f"{self.endpoint}/{self.bucket}/{obj['Key']}"
                urls.append(full_url)
        return urls

    async def download_file(self, file_path: str) -> bytes:
        if file_path.startswith("http"):
            pref = f"{self.endpoint}/{self.bucket}"
            if file_path.startswith(pref):
                object_key = file_path[len(pref):]
            else:
                raise HTTPException(status_code=400, detail="Некорректный формат ссылки на файл")
        else:
            object_key = file_path

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            ) as client:
                response = await client.get_object(Bucket=self.bucket, Key=object_key)
                return await response["Body"].read()
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "NoSuchKey":
                raise HTTPException(status_code=404, detail="Файл не найден в хранилище")
            raise HTTPException(status_code=500, detail=f"Ошибка загрузки из S3: {str(e)}")
    
    async def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        if file_path.startswith("http"):
            pref = f"{self.endpoint}/{self.bucket}/"
            if file_path.startswith(pref):
                object_key = file_path[len(pref):]
            else:
                raise HTTPException(status_code=400, detail="Некорректный формат ссылки")
        else:
            object_key = file_path

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            ) as client:
                presigned_url = await client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket, "Key": object_key},
                    ExpiresIn=expiration
                )
                return presigned_url
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка генерации временной ссылки: {str(e)}")