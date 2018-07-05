// var URL_ROOT="https://ancient-falls-19080.herokuapp.com";
var URL_ROOT="http://localhost:8000";

function newData(){
    $('#item_about_form').trigger('reset');
    $('#item_about_title').focus();
}

function stripUnderscore(itm) {
    var item_index = itm.indexOf("_");
    if (item_index > 0) {
        var stripped_item = itm.slice(0, item_index);
    }
    return stripped_item;
}

function resetFields(formid){    
    var success_field=formid+' .form_submission_success';
    var error_field=formid+' .form_submission_error';
    $(success_field).text("");
    $(error_field).text("");
}

//get a list of sub-items for a selected item
function fetchItemList(selected_item,section,url,req_field){
    console.log('selected_item '+selected_item)
    console.log('section '+section)
    console.log('url '+url)
    console.log('req_field '+req_field)

    $(req_field).html('');

    $.ajax({
        url:url,
        type:'GET',
        data:{'section':section,'item':selected_item},
        headers: {'X-My-App-Token': 'loganstyles'},
        success:function(response){
             console.log(response);
            if(response.success==true){
                var res_cats=(response.cats);
                console.log(res_cats);
                var options="";
                var proc_arr=[];

                if(req_field != '#request_users' && req_field != '#new_request_users' && req_field != '#request_update_users'){

                    //store received data temporarily
                    /*console.log('req_field '+req_field)
                    res_cats.forEach((curr_item,index,array)=>{
                        switch(req_field){
                            case '#request_sub1':
                            case '#request_update_sub1':
                            if(curr_item.sub_cat1){
                                proc_arr.push(curr_item.sub_cat1);
                            }
                            break;

                            case '#request_sub2':
                            case '#request_update_sub2':
                            if(curr_item.sub_cat2){
                                proc_arr.push(curr_item.sub_cat2);
                            }
                            break;
                        }

                    });
                     console.log(proc_arr);
                //remove duplicate entries
                var unique_items = proc_arr.filter( onlyUnique );
                 console.log(unique_items);
                unique_items.forEach((curr,index,array)=>{
                    if(curr){
                       options+='<option value="'+curr+'">'+curr+'</option>'; 
                    }
                    

                });*/

            }else{

                res_cats.forEach((curr_item,index,array)=>{
                    if(curr_item._id){
                       options+='<option value="'+curr_item._id+'">'+curr_item.displayName+'</option>'; 
                    }
                    
                });
            }


            $(req_field).html(options);
            if(req_field == '#request_sub1'){
                var category=$(req_field).val();
                //var section=$('#request_type').val();
                //fetchItemList(category,section,URL_ROOT+"/fetchSubCats2",'#request_sub2'); 
            }

            if(req_field == '#request_update_sub1'){
                var category=$(req_field).val();
                //var section=$('#request_type').val();
                //fetchItemList(category,section,URL_ROOT+"/fetchSubCats2",'#request_update_sub2'); 
            }

        }else{
            // console.log('response is false');                            
        }                        

    },
    error:function(xhr, status, err){
        // console.log('error');
        // console.log(xhr);
        // console.log(status);
        // console.log(err);
    }
});
}

function typeModalLoader(mode,type){
    /*mode:new,edit
    type:cat,story
    */
    switch (mode) {
        case 'new':
        // console.log('inside mode new for '+type);
        $("#page_modal #page_form").trigger('reset');
        $("#page_modal #page_id").val(0);
        $("#page_modal #page_type").val(type);
        $("#page_modal #page_mode").val("insert");
        $("#page_modal #page_title").val("").attr('readonly',false);
        $("#page_modal #page_description").text("").attr('readonly',false);
        $("#page_modal #page_header").text('Add');
        $("#page_modal").modal({backdrop: false, keyboard: false});
        break;

        default:
        break;
    }
}

function modalLoader(type, mode,cat_type) {

    console.log('type: ' + type);
    //console.log('mode: ' + mode);
    // console.log('cat_type: ' + cat_type);

    var form_action = "#" + type + "_action";
    var formid = "#" + type + "_form";
    var header = "#" + type + "_header";
    var submit_but = formid + " input[type='submit']";
    if(cat_type && type !='request'){
        var modal ="#"+type+"_"+cat_type+"_modal";
    }else{
        var modal ="#"+type+"_modal";
    }
    var section='';

    resetFields(formid);

    var itemid = "#" + type + "_id";
    // console.log('form_action: ' + form_action);
    // console.log('formid: ' + formid);
    // console.log('submit_but: ' + submit_but);
    // console.log('modal: ' + modal);

    switch (mode) {
        case 'new':
        //console.log('inside mode new: ');
        $(itemid).val(0);
        $(formid).trigger('reset');
        $(form_action).val("insert");
        $(modal).modal({backdrop: false, keyboard: false});
        $(header).text('Add');

        if(type != 'notice' && type != 'group'){
            var category_id="#"+type+"_modal "+"#"+type+"_category";
            // console.log(category_id);
            
        //determine type & make ajax call
        if(type == 'request'){
            section=cat_type;
            switch(section){
                case 'question':
                response_type='Answer';
                $('.request_article').hide();
                $('.request_question').show();
                $('.request_riddle').hide();
                break;

                case 'article':
                response_type='Review';
                $('.request_article').show();
                $('.request_question').hide();
                $('.request_riddle').hide();
                break;

                case 'riddle':
                response_type='Solution';
                $('.request_article').hide();
                $('.request_question').hide();
                $('.request_riddle').show();
                break;
            }
            $('#request_sub1_header').text('Request For '+response_type)
            $('#request_type').val(section);
            $('#request_sub1').html('');
            $('#request_sub2').html('');
            $('#request_users').html('');
            
        }else{section=type;}
        var url=URL_ROOT+'/fetchCats';
        // console.log(url);

        $.ajax({
            url:url,
            type:'GET',
            data:{'section':section},
            headers: {'X-My-App-Token': 'loganstyles'},
            success:function(response){
                // console.log(response);
                if(response.success==true){
                    var res_cats=(response.cats);
                    var options="";
                    res_cats.forEach((curr_item,index,array)=>{
                        if(curr_item.title){
                           options+='<option value="'+curr_item.title+'">'+curr_item.title+'</option>'; 
                        }
                        
                    });

                    $(category_id).html(options);
                    

                }else{
                    console.log('response is false');                            
                }                        

            },
            error:function(xhr, status, err){
                console.log('error');
                console.log(xhr);
                console.log(status);
                console.log(err);
            }
        });
    }
    
    break;

    case 'edit':
    //console.log('inside mode edit: ');                
    $(modal).modal({backdrop: false, keyboard: false});
    //$(header).text('Edit');
    break;

    default:
    break;
}
}


function answerModalLoader(type, mode,cat_type) {

    console.log('type: ' + type);
    console.log('mode: ' + mode);
    var formid = "#" + type + "_form";
    var submit_but = formid + " input[type='submit']";
    if(cat_type){
        var modal ="#"+type+"_"+cat_type+"_modal";
    }else{
        var modal ="#"+type+"_modal";
    }


    var itemid = "#" + type + "_id";
    console.log('formid: ' + formid);
    console.log('submit_but: ' + submit_but);
    console.log('modal: ' + modal);

    switch (mode) {
        case 'new':
        console.log('inside mode new: ');
        $(itemid).val(0);
        $(formid).trigger('reset');
        $(modal).modal({backdrop: false, keyboard: false});
        break;

        default:
        break;
    }
}

/*removes dupliates from an array*/
function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function convertToSentencCase(text_data){
    var n = text_data.split(".");
    var vfinal="";

    for(i=0;i<n.length;i++){
        var spaceput="";
        var space_count=n[i].replace(/^(\s*).*$/,"$1").length;
        n[i]=n[i].replace(/^\s+/,"");
        var newstring =n[i].charAt(n[i]).toUpperCase()+n[i].slice(1);

        for(j=0;j<space_count;j++)
            spaceput=spaceput+" ";
        vfinal=vfinal+spaceput+newstring+".";
    }
    vfinal=vfinal.substring(0,vfinal.length - 1);
    return vfinal;
}