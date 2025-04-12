import { LightningElement,track } from 'lwc';
import GetExternalUsers from '@salesforce/apex/ManageExternalUsers.GetExternalUsers';
import CreateResource from '@salesforce/apex/ManageExternalUsers.CreateResource';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class ExternalUserManagement extends LightningElement {
    @track Users;
    editUserModal = false;
    newUserModal = false;
    newTaskModal = false;
    viewTaskModal = false;
    loading = false;
    @track query='';
    @track page = 1;
    resourceName = 'users';
    @track editUserVlaues;
    disableNextBtn = false;
    @track cacheRecord = new Map();

    async FetchExternalUsers(){
        if(this.cacheRecord.has(this.page)){
            this.Users = this.cacheRecord.get(this.page);
            console.log('executed cache');
            return;
        }
        this.loading = true;
        await GetExternalUsers({resourceName:this.resourceName,query:this.query})
        .then(result=>{
            const tempRes = result.map(i=>({...i, customClass : i.IsActive ? 'dot-green' : 'dot-red'}))
            this.cacheRecord.set(this.page,tempRes);
            if(tempRes.length<5){
                this.disableNextBtn = true;
            }
            this.Users =tempRes;
            console.log(this.Users[0]);
        })
        .catch(error=>{
            this.disableNextBtn = true;
            console.log(error);
        })
        this.loading = false;
    }

    connectedCallback(){
        this.query = `?page=${this.page}&limit=5`;
        this.FetchExternalUsers();
    }

    toast(title,msg,varient) {
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            variant: varient,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    handleBtnActions(event){
        const btn = event.target.dataset.btn;
        const uid = event.target.dataset.uid;
        console.log(btn,uid);
        if(btn === 'editUser'){
            this.editUserModal = true;
            this.editUserVlaues = this.Users.find(user => user.id === uid);
        }
        else if(btn === 'newUser'){
            this.newUserModal = true;
        }
        else if(btn === 'newTask'){
            this.newTaskModal = true;
        }
        else if(btn === 'viewTask'){
            this.viewTaskModal = true;
        }

    }

    handleSave(event){
        const btn = event.target.dataset.btn;
        const formMap = {
            editSave: this.refs.editForm,
            newSave: this.refs.newForm,
            newTaskSave: this.refs.newTaskForm
        };
        const container = formMap[btn] || null;
        const inputs = container.querySelectorAll('lightning-input, lightning-input-rich-text');
        let values = {};
        inputs.forEach(input => {
            values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
        });
        console.log('Input Values:', values);
        const isoTodayDate = new Date().toISOString();
        if(btn==='newSave'){
            this.InsertNewResource('users',{...values,createdAt:isoTodayDate,LastModified:isoTodayDate});
        }
    }

    InsertNewResource(resource,jsonBody){
        CreateResource({resourceName:resource,Body:jsonBody})
        .then(result=>{
            if(result.statusCode!=='201'){
                this.toast('Error','Error occoured','error');
                console.log(result.responseBody);
                //this.handleModalCancel();
            }
            else{
                this.toast('sucess','Created successfully','success');
                const newResource = JSON.parse(result.responseBody);
                if(resource==='users'){
                    this.Users = [{...newResource,customClass : newResource.IsActive ? 'dot-green' : 'dot-red',name:newResource.Name},...this.Users];
                }
                this.handleModalCancel();
            }
        })
        .catch(error=>{
            console.log(error);
        })
    }

    handleModalCancel(){
        this.newUserModal = false;
        this.editUserModal = false;
        this.newTaskModal = false;
        this.viewTaskModal = false;
    }

    handlePagination(event){
        const btn = event.target.dataset.btn;
        if(btn==='next'){
            this.page+=1;
        }
        else if(btn==='prev'){
            if(this.page>1){
                this.page-=1;
                if(this.disableNextBtn){
                    this.disableNextBtn = false;
                }
            }
        }
        this.query = `?page=${this.page}&limit=5`;
        this.FetchExternalUsers();
    }
}